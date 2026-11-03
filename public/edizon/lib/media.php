<?php
/** Unggah gambar: diperiksa, diperkecil, dan disimpan ulang sebagai WebP (membuang metadata & kode tersembunyi). */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const UPLOAD_MAX_BYTES = 6291456;   // 6 MB
const UPLOAD_MAX_SIDE = 1800;       // sisi terpanjang setelah diperkecil (px)
const WEBP_QUALITY = 82;            // 0-100; 80-85 = ukuran jauh lebih kecil, hampir tak terlihat bedanya

/** @return array{ok:bool, path?:string, format?:string, bytes?:int, width?:int, height?:int, error?:string} */
function process_upload(array $file, ?int $userId): array
{
    if (!extension_loaded('gd')) {
        return ['ok' => false, 'error' => 'Ekstensi GD belum aktif di PHP server ini.'];
    }
    $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
        return ['ok' => false, 'error' => 'File terlalu besar (maksimal 6 MB).'];
    }
    if ($err !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'Unggahan gagal. Coba lagi.'];
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    if (!is_uploaded_file($tmp) || (int) ($file['size'] ?? 0) > UPLOAD_MAX_BYTES) {
        return ['ok' => false, 'error' => 'File tidak valid atau terlalu besar (maksimal 6 MB).'];
    }
    $info = @getimagesize($tmp);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
        return ['ok' => false, 'error' => 'Hanya gambar JPG, PNG, atau WebP yang diterima.'];
    }
    [$w, $h] = [(int) $info[0], (int) $info[1]];
    if ($w < 1 || $h < 1 || $w > 8000 || $h > 8000 || $w * $h > 40000000) {
        return ['ok' => false, 'error' => 'Dimensi gambar terlalu besar.'];
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($tmp);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        return ['ok' => false, 'error' => 'Jenis file tidak dikenali sebagai gambar.'];
    }

    $src = match ($info[2]) {
        IMAGETYPE_JPEG => @imagecreatefromjpeg($tmp),
        IMAGETYPE_PNG => @imagecreatefrompng($tmp),
        default => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($tmp) : false,
    };
    if (!$src) {
        return ['ok' => false, 'error' => 'Gambar tidak bisa dibaca. Coba simpan ulang sebagai JPG atau PNG.'];
    }

    // putar sesuai orientasi kamera (foto dari HP sering "tidur")
    if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
        $exif = @exif_read_data($tmp);
        $o = (int) ($exif['Orientation'] ?? 1);
        $angle = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
        if ($angle !== 0) {
            $rot = imagerotate($src, $angle, 0);
            if ($rot) {
                $src = $rot;
                [$w, $h] = [imagesx($src), imagesy($src)];
            }
        }
    }

    if (max($w, $h) > UPLOAD_MAX_SIDE) {
        $scale = UPLOAD_MAX_SIDE / max($w, $h);
        $scaled = imagescale($src, max(1, (int) round($w * $scale)), max(1, (int) round($h * $scale)), IMG_BICUBIC);
        if ($scaled) {
            $src = $scaled;
            [$w, $h] = [imagesx($src), imagesy($src)];
        }
    }

    // gambar PNG/WebP yang punya bagian transparan: transparansinya dipertahankan
    $keepAlpha = false;
    if ($info[2] !== IMAGETYPE_JPEG) {
        for ($x = 0; $x < $w && !$keepAlpha; $x += max(1, intdiv($w, 24))) {
            for ($y = 0; $y < $h; $y += max(1, intdiv($h, 24))) {
                if (((imagecolorat($src, $x, $y) >> 24) & 0x7F) > 0) {
                    $keepAlpha = true;
                    break;
                }
            }
        }
    }
    // WebP bila GD mendukung (lebih kecil dari JPG/PNG, memuat halaman lebih cepat); kalau tidak, JPG/PNG seperti sebelumnya
    $useWebp = function_exists('imagewebp');
    $ext = $useWebp ? 'webp' : ($keepAlpha ? 'png' : 'jpg');
    $mimeOut = $useWebp ? 'image/webp' : ($keepAlpha ? 'image/png' : 'image/jpeg');

    $sub = gmdate('Y') . '/' . gmdate('m');
    $dir = uploads_dir() . '/' . $sub;
    ensure_dir(uploads_dir());
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        return ['ok' => false, 'error' => 'Folder unggahan tidak bisa dibuat. Periksa izin folder di server.'];
    }
    $name = bin2hex(random_bytes(8)) . '.' . $ext;
    $dest = $dir . '/' . $name;

    if ($useWebp) {
        $canvas = imagecreatetruecolor($w, $h);
        if ($keepAlpha) {
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 255, 255, 255, 127));
        } else {
            imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        }
        imagecopy($canvas, $src, 0, 0, 0, 0, $w, $h);
        $ok = imagewebp($canvas, $dest, WEBP_QUALITY);
    } elseif ($keepAlpha) {
        imagesavealpha($src, true);
        $ok = imagepng($src, $dest, 6);
    } else {
        $flat = imagecreatetruecolor($w, $h);
        imagefill($flat, 0, 0, imagecolorallocate($flat, 255, 255, 255));
        imagecopy($flat, $src, 0, 0, 0, 0, $w, $h);
        $ok = imagejpeg($flat, $dest, 85);
    }
    if (!$ok || !is_file($dest)) {
        return ['ok' => false, 'error' => 'Gambar gagal disimpan di server.'];
    }
    @chmod($dest, 0644);

    $path = '/uploads/' . $sub . '/' . $name;
    $orig = clean_text(pathinfo((string) ($file['name'] ?? 'gambar'), PATHINFO_FILENAME), 150) . '.' . $ext;
    db()->prepare('INSERT INTO media (path, original_name, mime, width, height, bytes, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$path, $orig, $mimeOut, $w, $h, (int) filesize($dest), $userId, now_utc()]);
    return ['ok' => true, 'path' => $path, 'format' => $ext, 'bytes' => (int) filesize($dest), 'width' => $w, 'height' => $h];
}

function media_list(int $limit = 60): array
{
    return db()->query('SELECT path, original_name, width, height FROM media ORDER BY id DESC LIMIT ' . (int) $limit)->fetchAll();
}

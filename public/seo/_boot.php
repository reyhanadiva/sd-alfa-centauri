<?php
declare(strict_types=1);
require dirname(__DIR__) . '/articles/_boot.php';

/** artikel terbit yang boleh diindeks: [row + seo + tags] */
function seo_public_articles(): array
{
    $rows = db()->query(ART_SELECT . " WHERE a.status = 'published' AND a.published_at <= UTC_TIMESTAMP() ORDER BY a.published_at DESC")->fetchAll();
    $rows = art_attach_tags(array_map('art_row_extra', $rows));
    return array_values(array_filter($rows, static fn($a) => empty($a['seo']['noindex'])));
}

function seo_public_forms(): array
{
    try {
        return array_values(array_filter(forms_all(), static fn($f) => $f['status'] === 'published' && $f['layout'] === 'page'));
    } catch (Throwable) {
        return [];
    }
}

function seo_text(string $body, string $type): void
{
    header('Content-Type: ' . $type . '; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: public, max-age=600');
    echo $body;
}

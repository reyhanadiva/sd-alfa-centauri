<?php
/**
 * Pembersih HTML untuk "blok HTML" (hanya Admin yang boleh membuatnya).
 * Daftar putih: hanya tag, atribut, dan properti CSS yang aman yang dipertahankan.
 * Skrip, iframe, form, atribut onclick, link javascript:, dan sejenisnya dibuang.
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const HTML_ALLOWED_TAGS = [
    'div', 'span', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sup', 'sub', 'mark',
    'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'section', 'article', 'header', 'footer',
];

/** tag berbahaya: dibuang beserta isinya */
const HTML_DROP_TAGS = [
    'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'link', 'meta', 'base',
    'form', 'input', 'button', 'textarea', 'select', 'option', 'svg', 'math', 'noscript', 'template',
    'audio', 'video', 'source', 'track', 'canvas', 'dialog', 'head', 'title',
];

const HTML_ALLOWED_ATTRS = [
    '*' => ['class', 'title', 'style', 'aria-label'],
    'a' => ['href', 'target', 'rel'],
    'img' => ['src', 'alt', 'width', 'height', 'loading'],
    'td' => ['colspan', 'rowspan'],
    'th' => ['colspan', 'rowspan'],
];

const CSS_ALLOWED_PROPS = [
    'color', 'background', 'background-color', 'font-size', 'font-weight', 'font-style', 'line-height',
    'letter-spacing', 'text-align', 'text-decoration', 'text-transform', 'white-space',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-color', 'border-width', 'border-style', 'border-radius',
    'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
    'display', 'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'align-items', 'justify-content',
    'gap', 'row-gap', 'column-gap', 'grid-template-columns', 'opacity', 'box-shadow', 'object-fit', 'aspect-ratio',
    'list-style', 'overflow',
];

function sanitize_html(string $html): string
{
    $html = trim($html);
    if ($html === '' || !class_exists('DOMDocument')) {
        return '';
    }
    $dom = new DOMDocument('1.0', 'UTF-8');
    $prev = libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8"><body><div id="__root">' . $html . '</div></body>', LIBXML_NONET | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);

    $xp = new DOMXPath($dom);
    $rootList = $xp->query('//div[@id="__root"]');
    if (!$rootList || $rootList->length === 0) {
        return '';
    }
    /** @var DOMElement $root */
    $root = $rootList->item(0);
    sanitize_children($root);

    $out = '';
    foreach (iterator_to_array($root->childNodes) as $child) {
        $out .= $dom->saveHTML($child);
    }
    return trim($out);
}

function sanitize_children(DOMNode $node): void
{
    foreach (iterator_to_array($node->childNodes) as $child) {
        if ($child instanceof DOMComment || $child instanceof DOMProcessingInstruction || $child instanceof DOMDocumentType) {
            $node->removeChild($child);
            continue;
        }
        if (!($child instanceof DOMElement)) {
            continue; // teks biasa aman
        }
        $tag = strtolower($child->tagName);
        if (in_array($tag, HTML_DROP_TAGS, true)) {
            $node->removeChild($child);
            continue;
        }
        sanitize_children($child);
        if (!in_array($tag, HTML_ALLOWED_TAGS, true)) {
            // tag tidak dikenal: buang tag-nya, pertahankan isinya
            while ($child->firstChild) {
                $node->insertBefore($child->firstChild, $child);
            }
            $node->removeChild($child);
            continue;
        }
        sanitize_attributes($child, $tag);
    }
}

function sanitize_attributes(DOMElement $el, string $tag): void
{
    $allowed = array_merge(HTML_ALLOWED_ATTRS['*'], HTML_ALLOWED_ATTRS[$tag] ?? []);
    foreach (iterator_to_array($el->attributes) as $attr) {
        $name = strtolower($attr->name);
        if (!in_array($name, $allowed, true)) {
            $el->removeAttribute($attr->name);
            continue;
        }
        $value = $attr->value;
        switch ($name) {
            case 'href':
            case 'src':
                $safe = safe_url($value, $name === 'src');
                if ($safe === null) {
                    $el->removeAttribute($attr->name);
                } else {
                    $el->setAttribute($attr->name, $safe);
                }
                break;
            case 'style':
                $css = safe_style($value);
                if ($css === '') {
                    $el->removeAttribute('style');
                } else {
                    $el->setAttribute('style', $css);
                }
                break;
            case 'class':
                $cls = trim(preg_replace('/[^A-Za-z0-9_:\-\/\.\[\]%# ]/', '', $value) ?? '');
                if ($cls === '') {
                    $el->removeAttribute('class');
                } else {
                    $el->setAttribute('class', $cls);
                }
                break;
            case 'target':
                $el->setAttribute('target', '_blank');
                break;
            case 'width':
            case 'height':
            case 'colspan':
            case 'rowspan':
                if (!preg_match('/^\d{1,4}$/', trim($value))) {
                    $el->removeAttribute($attr->name);
                }
                break;
            case 'loading':
                $el->setAttribute('loading', 'lazy');
                break;
            default:
                $el->setAttribute($attr->name, mb_substr($value, 0, 300));
        }
    }
    if ($tag === 'a' && $el->hasAttribute('href')) {
        $href = $el->getAttribute('href');
        if (preg_match('#^(https?:)?//#i', $href)) {
            $el->setAttribute('target', '_blank');
        }
        if ($el->getAttribute('target') === '_blank') {
            $el->setAttribute('rel', 'noopener noreferrer');
        } else {
            $el->removeAttribute('rel');
        }
    } elseif ($tag === 'a') {
        $el->removeAttribute('target');
        $el->removeAttribute('rel');
    }
    if ($tag === 'img') {
        if (!$el->hasAttribute('src')) {
            $el->parentNode?->removeChild($el);
            return;
        }
        if (!$el->hasAttribute('alt')) {
            $el->setAttribute('alt', '');
        }
        $el->setAttribute('loading', 'lazy');
    }
}

/** hanya http(s), mailto, tel, jalur relatif, dan #anchor. Data: dan javascript: ditolak. */
function safe_url(string $url, bool $imageOnly = false): ?string
{
    $url = trim($url);
    if (preg_match('/^\[form:([A-Za-z0-9-]{1,60})\]$/', $url, $fm)) {
        return '#form:' . strtolower($fm[1]); // shortcode formulir -> tautan pop-up
    }
    if (preg_match('/^\[popup:([A-Za-z0-9-]{1,60})\]$/', $url, $pm)) {
        return '#popup:' . strtolower($pm[1]); // shortcode pop-up -> tautan pop-up
    }
    if (preg_match('/^\[quiz:([A-Za-z0-9-]{1,60})\]$/', $url, $qm)) {
        return '#quiz:' . strtolower($qm[1]); // shortcode kuis -> tautan kuis
    }
    if (preg_match('/^#quiz:[A-Za-z0-9-]{1,60}$/', $url)) {
        return strtolower($url);
    }
    if ($url === '' || strlen($url) > 500) {
        return null;
    }
    $probe = strtolower(preg_replace('/[\x00-\x20\x7f]+/', '', $url) ?? '');
    if (preg_match('/^(javascript|data|vbscript|file|blob):/', $probe)) {
        return null;
    }
    if (preg_match('#^(https?://|//|/|\./|\.\./|\#)#i', $url)) {
        return $url;
    }
    if (!$imageOnly && preg_match('/^(mailto|tel):/i', $url)) {
        return $url;
    }
    if (!preg_match('/^[a-z][a-z0-9+.\-]*:/i', $url)) {
        return $url; // relatif tanpa skema, mis. "gambar.jpg"
    }
    return null;
}

function safe_style(string $style): string
{
    $out = [];
    foreach (explode(';', $style) as $decl) {
        if (strpos($decl, ':') === false) {
            continue;
        }
        [$prop, $val] = array_map('trim', explode(':', $decl, 2));
        $prop = strtolower($prop);
        if (!in_array($prop, CSS_ALLOWED_PROPS, true) || $val === '' || strlen($val) > 200) {
            continue;
        }
        $lv = strtolower($val);
        if (preg_match('/url\s*\(|expression|javascript|@import|behavior|binding|\\\\|[<>{}]|\/\*|!important/i', $lv)) {
            continue;
        }
        $out[] = $prop . ': ' . $val;
    }
    return implode('; ', $out);
}

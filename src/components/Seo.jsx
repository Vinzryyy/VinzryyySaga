/**
 * Seo helper — emits per-page <title>, <meta description>, canonical
 * link, OG/Twitter tags, and optional JSON-LD structured data via
 * react-helmet-async. Defaults bubble up from index.html for any page
 * that doesn't override.
 *
 * Pages pass their entry from src/lib/pageMeta.js, which the build also
 * uses to write each page's HTML with the same tags (link previews).
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { DEFAULT_IMAGE, fullTitle as withSiteName, pageUrl } from '../lib/pageMeta';

const Seo = ({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  jsonLd,
}) => {
  const fullTitle = withSiteName(title);
  const url = pageUrl(path);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta name="twitter:site" content="@armeniaca15" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default Seo;

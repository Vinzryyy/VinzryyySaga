/**
 * Seo helper — emits per-page <title>, <meta description>, canonical
 * link, and OG/Twitter tags via react-helmet-async. Defaults bubble
 * up from index.html for any page that doesn't override.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://armeniaca.online';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-card.png`;

const Seo = ({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
}) => {
  const fullTitle = title ? `${title} · Armeniaca` : 'Armeniaca — Arsip Visual Eli JKT48';
  const url = `${SITE_URL}${path === '/' ? '' : path}`;

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
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default Seo;

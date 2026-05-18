import { Helmet } from 'react-helmet-async';

const SITE = 'https://africa-scout-pulse.lovable.app';
const DEFAULT_OG = `${SITE}/og-default.jpg`;

type Props = {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

const Seo = ({ title, description, path, ogType = 'website', ogImage, jsonLd }: Props) => {
  const url = `${SITE}${path}`;
  const img = ogImage || DEFAULT_OG;
  const ldArr = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={img} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      {ldArr.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
};

export default Seo;

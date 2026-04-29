/**
 * Wish card templates — 5 distinct designs sharing the Armeniaca palette
 * (burgundy / cream / gold) and editorial language.
 *
 * Each template accepts `{ wish }` where wish has:
 *   { name: string, handle?: string, message: string, date?: string (ISO) }
 *
 * Use `WISH_TEMPLATES` to cycle through them in a list, or import a
 * specific one directly when you want a single look.
 */

import Template1Editorial from './Template1Editorial';
import Template2Polaroid from './Template2Polaroid';
import Template3Telegram from './Template3Telegram';
import Template4Pullquote from './Template4Pullquote';
import Template5Postcard from './Template5Postcard';

export {
  Template1Editorial,
  Template2Polaroid,
  Template3Telegram,
  Template4Pullquote,
  Template5Postcard,
};

export const WISH_TEMPLATES = [
  { id: 'editorial', label: 'Editorial Plate', Component: Template1Editorial },
  { id: 'polaroid',  label: 'Polaroid Note',   Component: Template2Polaroid  },
  { id: 'telegram',  label: 'Vintage Telegram', Component: Template3Telegram },
  { id: 'pullquote', label: 'Magazine Pullquote', Component: Template4Pullquote },
  { id: 'postcard',  label: 'Postcard + Stamp', Component: Template5Postcard },
];

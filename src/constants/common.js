// src/constants/postcodes.js
import { LOCATIONS } from './locations.js'

export const ST_KILDA_POSTCODES = LOCATIONS.find(
  (l) => l.slug === 'stkilda'
).postcodes
export const FITZROY_RICHMOND_POSTCODES = LOCATIONS.find(
  (l) => l.slug === 'fitzroy'
).postcodes
export const LML_URL_TODAY = 'https://lml.live/?dateRange=today'
export const BRAND_BLUE = '#00B2E3'
export const BRAND_ORANGE = '#FF5C35'
export const INSTAGRAM_HEIGHT = 960
export const HEADER_HEIGHT = 48
export const MIN_BOTTOM_MARGIN = 24
export const CONTAINER_HEIGHT =
  INSTAGRAM_HEIGHT - HEADER_HEIGHT - MIN_BOTTOM_MARGIN - 16
export const TITLE_CAPTION =
  'Live Music Locator is a not-for-profit service designed to make it possible to discover every gig playing at every venue across every genre at any one time. This information will always be verified and free, importantly supporting musicians, our small to medium live music venues, and you the punters. More detailed gig information here: https://lml.live/?dateRange=today'

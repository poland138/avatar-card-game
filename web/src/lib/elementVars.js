import { ELEMENTS } from '@core/constants';

export function elementVars(suit) {
  const e = ELEMENTS[suit];
  return { '--el-bg': e.bg, '--el-border': e.border, '--el-text': e.text };
}

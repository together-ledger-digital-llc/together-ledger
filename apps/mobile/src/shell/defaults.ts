/** Defaults the web's shell primitives use (src/app.js), so the phone says and times the same. */
import { t } from '../i18n/sentences.js';

/** How long a toast stays: the web's 2.6 seconds. A new toast replaces the one showing. */
export const TOAST_MS = 2600;

/** What a pending button says when the caller does not name the work (setButtonPending). */
export const workingLabel = () => t('common.action.working');

/** The consequence dialog's way out, unless the caller names a better one. */
export const keepThingsLabel = () => t('common.consequence.keep');

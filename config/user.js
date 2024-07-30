/* INFO:
 *  The views in these scripts are the markdown files in the `VIEWS_PATH`
 * directory, which by default is "Views".
 *  A view name is the file name of a view without the ".md" suffix.
 *  The tags in this script are the Obsidian tags, which start with
 * a "#" and can't include " ".
 *  As tags can't include " " and view names can't include "/" these are
 * replaced so that all "/" in tags are now represented by " " in view names.
 *  An initiated view is a view with an existing file, while an uninitiated
 * view is a view which we know can exist (has tags or custom views) but
 * their file hasn't been created yet.
 *  `app` is the Obsidian private API, which may break in future obsidian
 * versions but it's way more useful than the public API.
 *  The scripts are using CommonJS so that cyclic dependencies and JSDoc
 * work as expected, with the Modules plugin.
 */

/** @type {string} The location of all views. */
const VIEWS_PATH = "Views";

/** @type {string} The location of all things. */
const THINGS_PATH = "Things";

/**
 * If `renderViewsList()` renders initiated and uninitiated views mixed,
 * instead of having all the initiated before the uninitiated.
 * @type {boolean}
 */
const MERGE_VIEWS_IN_LIST = false;

const { regularViewMatchesTags } = require("./core.js");
/** @import { CustomTags, CustomViews } from "./core.js"; */

/** @type {CustomViews} */
const CUSTOM_VIEWS = {};

/** @type {CustomTags} */
const CUSTOM_TAGS = {};

module.exports = {
  VIEWS_PATH,
  THINGS_PATH,
  MERGE_VIEWS_IN_LIST,
  CUSTOM_VIEWS,
  CUSTOM_TAGS,
};

/** @type {string} */
const VIEWS_PATH = "Views";

const {
  viewMatchesTags,
  getAllTags,
  getInitiatedViewNames,
} = require("./core.js");
/** @import { CustomTags, CustomViews } from "./core"; */

/** @type {CustomViews} */
const CUSTOM_VIEWS = {};

/** @type {CustomTags} */
const CUSTOM_TAGS = {};

// Using CommonJS so that cyclic dependencies work
module.exports = {
  VIEWS_PATH,
  CUSTOM_VIEWS,
  CUSTOM_TAGS,
};

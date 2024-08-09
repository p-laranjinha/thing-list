// Most of these settings can be overwritten when calling the functions.
// So these are defaults that you can later customize for special cases.
// The ones that can't be overwritten are the names for the core views and tags.
//  The `ALL_NAME`, `UNTAGGED_NAME`, `OTHERS_NAME`, and `ARCHIVE_NAME`.
//  Delete the contents of `CORE_CUSTOM_VIEWS` and `CORE_CUSTOM_TAGS` from
//   `core.js` and add them here to `CUSTOM_VIEWS` and `CUSTOM_TAGS` if you
//   want more control over them.

// =============================================== //
// Localization (or changing names you don't like) //
// =============================================== //

// If you want to change the property names of things, you have to change
//  `thing.md`, the `file.XXXX` referenced in `TABLE_COLUMNS` and
//  `RENDER_ICON_LINK_PROPERTY`.

/**
 * The name of the core custom view that shows all things.
 */
const ALL_NAME = "All";
/**
 * The name of the core custom view that shows things without tags.
 */
const UNTAGGED_NAME = "Untagged";
/**
 * The name of the core custom view that shows things not shown in any
 *  initiated view.
 * An initiated view is a view with an existing file, while an uninitiated
 *  view is a view which we know can exist (has tags or custom views) but
 *  their file hasn't been created yet.
 */
const OTHERS_NAME = "Others";
/**
 * The name of a core custom tag that hides a thing from all other views,
 *  including `ALL_NAME`.
 */
const ARCHIVE_NAME = "Archive";

// ----------

/**
 * The location for all autogenerated views.
 * This value is also set in the `Templater` plugin for `Folder templates`.
 */
const VIEWS_PATH = "Views";
/**
 * The location for all things and subfolders containing more things.
 * This value is also set in Obsidian settings in
 *  `Files and links>Folder to create new notes in` and in the
 *  `Templater` plugin for `Folder templates`.
 */
const THINGS_PATH = "Things";

// ----------

/**
 * The text of the button rendered by `renderThingButton`.
 */
const ADD_THING_BUTTON_TEXT = "Add Thing";
/**
 * The name of the thing generated when the button rendered by
 *  `renderThingButton` is pressed.
 */
const NEW_THING_NAME = "Untitled";

// ----------

/**
 * The thing property used by `renderIcon` as an image source.
 */
const RENDER_ICON_LINK_PROPERTY = "icon";
/**
 * The width of the icon rendered by `renderIcon`.
 */
const RENDER_ICON_WIDTH = "32px";
/**
 * The height of the icon rendered by `renderIcon`.
 */
const RENDER_ICON_HEIGHT = "32px";

// =================== //
// Functional settings //
// =================== //

/**
 * If `renderViewsList` renders initiated and uninitiated views mixed,
 *  instead of having all the initiated before the uninitiated.
 * An initiated view is a view with an existing file, while an uninitiated
 *  view is a view which we know can exist (has tags or custom views) but
 *  their file hasn't been created yet.
 */
const MERGE_VIEWS_IN_LIST = false;
/**
 * If `renderViewsList` renders views with their " " replaced by "/".
 * Useful because " " in views represent "/" in tags.
 * Can be confusing if subfolders are being used.
 */
const REPLACE_VIEW_SPACES_WITH_SLASHES = true;
/**
 * A list of view names that `renderViewsList` pins to the top.
 */
const PINNED_VIEW_NAMES = [ALL_NAME, UNTAGGED_NAME, OTHERS_NAME];
/**
 * A prefix `renderViewsList` adds to pinned views.
 */
const PINNED_VIEW_NAME_PREFIX = "🖈 ";

// ----------

/**
 * If `getAllViews` calculates uninitiated subfolder views, instead of just
 *  getting the root uninitiated views at `VIEWS_PATH`.
 * An initiated view is a view with an existing file, while an uninitiated
 *  view is a view which we know can exist (has tags or custom views) but
 *  their file hasn't been created yet.
 */
const CALCULATE_SUBFOLDER_UNINITIATED = true;

// ----------

/**
 * A callback that takes a Dataview plugin's file and returns something sortable
 *  in order to sort the thing tables rendered by `renderViewTable`.
 * @type {(file)=>any}
 */
const TABLE_SORT = (file) => file.file.name;
/**
 * A dictionary of callbacks where each key is a column name and each callback
 *  takes a Dataview plugin's file and returns what is rendered on the column
 *  of thing tables rendered by `renderViewTable`.
 * @type {{ [column_name: string]: ((file)=>string) }}
 */
const TABLE_COLUMNS = {
  "": (file) => `![|16x16](${file.icon})`,
  Name: (file) => `[[${file.file.path}|${file.name}]]`,
  Description: (file) => file.description,
  Tags: (file) => {
    let tags = "";
    // When there are no tags, the file returns null instead of []
    if (file.tags != null) {
      tags = file.tags.sort().reduce((accumulator, tag) => {
        return accumulator + " #" + tag;
      }, "");
    }
    return tags;
  },
  URL: (file) => file.url,
  "Created date": (file) => file.ctime,
  "Modified date": (file) => file.mtime,
};

// ============================ //
// Create custom Views and Tags //
// ============================ //

/**
 * Even though the Module plugin supports circular dependencies, it doesn't
 *  seem to work by using `require` at the top level and using the imported
 *  values inside the functions of `CUSTOM_VIEWS` and `CUSTOM_TAGS`.
 * Use this, or just a regular `require` inside each `CUSTOM_VIEWS` and
 *  `CUSTOM_TAGS` function.
 */
function requireCore() {
  return require("config/core.js");
}
/** @import { CustomTags, CustomViews } from "./core.js"; */

/**
 * Read the `requireCore` description above to know how to use functions from
 *  `core.js` in these functions.
 * Read the `CustomViews` description at the top of `core.js` for more info.
 * @type {CustomViews}
 */
const CUSTOM_VIEWS = {};
/**
 * Read the `requireCore` description above to know how to use functions from
 *  `core.js` in these functions.
 * Read the `CustomTags` description at the top of `core.js` for more info.
 * @type {CustomTags}
 */
const CUSTOM_TAGS = {};

// ======================= //
// Exporting all constants //
// ======================= //

module.exports = {
  ALL_NAME,
  UNTAGGED_NAME,
  OTHERS_NAME,
  ARCHIVE_NAME,
  VIEWS_PATH,
  THINGS_PATH,
  ADD_THING_BUTTON_TEXT,
  NEW_THING_NAME,
  RENDER_ICON_LINK_PROPERTY,
  RENDER_ICON_WIDTH,
  RENDER_ICON_HEIGHT,
  MERGE_VIEWS_IN_LIST,
  REPLACE_VIEW_SPACES_WITH_SLASHES,
  PINNED_VIEW_NAMES,
  PINNED_VIEW_NAME_PREFIX,
  CALCULATE_SUBFOLDER_UNINITIATED,
  TABLE_SORT,
  TABLE_COLUMNS,
  CUSTOM_VIEWS,
  CUSTOM_TAGS,
};

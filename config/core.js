// `app` is the Obsidian private API.
// May break in future versions but it's way more useful than the public API.
// The following line does nothing, it's here to signify that it exists.
app = app;

const { VIEWS_PATH, CUSTOM_VIEWS, CUSTOM_TAGS } = require("./user.js");

/**
 * @typedef CustomViews
 * @type {Object.<string, (tag_names: string[]) => boolean>}
 * Views where you can set what things they will try to show.
 * Matching things can be excluded from a view by using custom tags.
 * The key is a string with the name of the view.
 * The value is a function to check if a thing belongs to the view.
 */
/** @type {CustomViews} */
const CORE_CUSTOM_VIEWS = {
  All: (_) => true,
  Untagged: (tag_names) => tag_names.length === 0,
  Others: (tag_names) => {
    const core_custom_view_names = Object.keys(CORE_CUSTOM_VIEWS);
    const user_custom_view_names = Object.keys(CUSTOM_VIEWS);
    for (const view_name of getInitiatedViewNames()) {
      // Ignore all core custom views in "Others"
      if (core_custom_view_names.includes(view_name)) {
        continue;
      }
      // If a regular or custom view matches, it doesn't show on the "Others" view
      if (
        user_custom_view_names.includes(view_name) ||
        regularViewMatchesTags(view_name, tag_names)
      ) {
        return false;
      }
    }
    return true;
  },
};

/**
 * @typedef CustomTags
 * @type {Object.<string, (view_name: string) => boolean}
 * Tags where you can set in which views the thing is allowed to appear.
 * Views still need to match the thing for it to appear.
 * The key is a string with the tag.
 * The value is a function to check if a tag belongs to a view.
 */
/** @type {CustomTags} */
const CORE_CUSTOM_TAGS = {
  Archive: (view_name) => view_name === "Archive",
};

/**
 * Returns a Dataview plugin table with all the things for a view.
 * @param dv The Dataview plugin's API.
 * @param {string} view_name The name of the view.
 * @returns A Dataview plugin table.
 */
function getViewTable(dv, view_name) {
  return dv.table(
    ["", "Name", "Description", "Tags", "URL"],
    dv
      .pages('"DB"')
      .where((file) => viewMatchesTags(file.tags, view_name))
      .sort((file) => file.file.name)
      .map((file) => {
        const icon = `![|16x16](${file.icon})`;
        const name = `[[${file.file.path}|${file.name}]]`;
        const description = file.description;
        let tags = "";
        // When there are no tags, the file returns null instead of []
        if (file.tags != null) {
          tags = file.tags.sort().reduce((accumulator, tag) => {
            return accumulator + " #" + tag;
          }, "");
        }
        const url = file.url;
        return [icon, name, description, tags, url];
      }),
  );
}

/**
 * Checks if view matches the tags.
 * @param {string} view_name The name of the view to check.
 * @param {string[]} tag_names An array of tag names to check.
 * @returns {boolean} If a view matches the tags.
 */
function viewMatchesTags(view_name, tag_names) {
  // When there are no tags, the Dataview plugin's file returns null instead of []
  if (tag_names == null) {
    tag_names = [];
  }

  // If a custom tag matches one of the tag_names,
  // both the functions from the custom tags and the custom/regular view
  // need to be true for all tags for a thing to show on a view.

  const user_custom_tag_names = Object.keys(CUSTOM_TAGS);
  const core_custom_tag_names = Object.keys(CORE_CUSTOM_TAGS);
  for (const tag_name of tag_names) {
    // Let user custom tags overwrite core custom tags.
    if (user_custom_tag_names.includes(tag_name)) {
      if (!CUSTOM_TAGS[tag_name](view_name)) {
        return false;
      }
    } else if (core_custom_tag_names.includes(tag_name)) {
      if (!CORE_CUSTOM_TAGS[tag_name](view_name)) {
        return false;
      }
    }
  }

  const user_custom_view_names = Object.keys(CUSTOM_VIEWS);
  const core_custom_view_names = Object.keys(CORE_CUSTOM_VIEWS);
  // Let user custom views overwrite core custom views.
  if (user_custom_view_names.includes(view_name)) {
    return CUSTOM_VIEWS[view_name](tag_names);
  } else if (core_custom_view_names.includes(view_name)) {
    return CORE_CUSTOM_VIEWS[view_name](tag_names);
  }

  return regularViewMatchesTags(view_name, tag_names);
}

/**
 * Checks if a regular (not custom) view matches at least one tag.
 * @param {string} view_name The name of the view to check. Its a tag with "/" replaced by " ".
 * @param {string[]} tag_names An array of tag names to check.
 * @returns {boolean} If a view matches at least one tag.
 */
function regularViewMatchesTags(view_name, tag_names) {
  for (const tag_name of tag_names) {
    // If the view is nested
    if (view_name.includes(" ")) {
      const view_name_split = view_name.split(" ");
      const tag_name_split = tag_name.split("/");
      // If the view is more nested than the tag, it can't match
      if (view_name_split.length > tag_name_split.length) {
        continue;
      }
      // If all the view's nested match all or the starting nested of the tag, it's a match
      let view_matches_tag = true;
      for (let i = 0; i < view_name_split.length; i++) {
        if (view_name_split[i] !== tag_name_split[i]) {
          view_matches_tag = false;
          break;
        }
      }
      if (view_matches_tag) {
        return true;
      }
    }
    // If the view is not nested
    else {
      if (tag_name.split("/")[0] === view_name) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @returns {string[]} A list of all tags names without the "#" prefix.
 */
function getAllTagNames() {
  const tag_counts = app.metadataCache.getTags();
  const tag_names_with_hashtag = Object.keys(tag_counts);
  const tag_names = tag_names_with_hashtag.map((tag) => tag.slice(1));
  return tag_names;
}

/**
 * @returns {string[]} A list of the filenames of the views without the ".md" extension.
 */
function getInitiatedViewNames() {
  const files = app.vault.getFiles();
  const view_files = files.filter((file) => file.parent.path === VIEWS_PATH);
  const views = view_files.map((file) => file.basename);
  return views;
}

// Using CommonJS so that cyclic dependencies work
module.exports = {
  viewMatchesTags: regularViewMatchesTags,
  getAllTags: getAllTagNames,
  getInitiatedViewNames,
};

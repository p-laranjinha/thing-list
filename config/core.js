/* INFO:
 * Views can find all things in the specified folder as well as any subfolders
 *  inside said specified folder.
 * `app` is the Obsidian private API, which may break in future obsidian
 *  versions but it's way more useful than the public API.
 * The scripts are using CommonJS so that cyclic dependencies and JSDoc
 *  work as expected, with the Modules plugin.
 */

/**
 * @typedef ViewName
 * @type {string}
 * The path and name of a view file inside the `VIEWS_PATH` folder (which by
 *  default is "Views"), without the ".md" extension.
 * The path has its root inside the `VIEWS_PATH` folder, meaning that it isn't
 *  included in the path.
 * Regular `ViewName` are `TagName` with the tag's "/" replaced by " ",
 *  because tags can't contain " " so there is no risk of confusion, and in
 *  view names the "/" are the separation between subfolders in the path.
 * If a `ViewName` starts with "/" it means that it only appears on the
 *  specified location, be it root or subfolder.
 * If a `ViewName` doesn't start with "/" it means that it appears on all
 *  locations ending with the `ViewName`, meaning on root and every subfolder
 *  if no subfolder is specified, or every subfolder with the same name if a
 *  subfolder is specified.
 */

/**
 * @typedef TagName
 * @type {string}
 * An Obsidian tag without the "#" prefix.
 * These tags can't contain " " and use "/" to show subtags.
 */

/**
 * @typedef CustomViews
 * @type {Object.<ViewName, (tag_names: TagName[]) => boolean>}
 * Views where you can set what things they will try to show.
 * Matching things can be excluded from a view by using `CustomTags`.
 * The keys are `ViewName`s, and can either replace a regular view or be
 *  something completely new.
 * The values are functions to check if a thing belongs to the view.
 */

/**
 * @typedef CustomTags
 * @type {Object.<TagName, (view_name: ViewName) => boolean}
 * Tags where you can set in which views the thing is allowed to appear.
 * Views still need to match the thing for it to appear.
 * The key is a `TagName`.
 * The value is a function to check if a tag belongs to a view.
 */

const {
  VIEWS_PATH,
  THINGS_PATH,
  MERGE_VIEWS_IN_LIST,
  CUSTOM_VIEWS,
  CUSTOM_TAGS,
} = require("./user.js");

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
module.exports.CORE_CUSTOM_VIEWS = CORE_CUSTOM_VIEWS;

/** @type {CustomTags} */
const CORE_CUSTOM_TAGS = {
  Archive: (view_name) => view_name === "Archive",
};
module.exports.CORE_CUSTOM_TAGS = CORE_CUSTOM_TAGS;

/**
 * Renders a list with all views.
 * @param dv
 * The Dataview plugin's API.
 * @param {ViewName[]} pinned_view_names
 * The names of all the views to be pinned to the top.
 * Subfolders and a "/" prefix will be ignored.
 */
function renderViewsList(dv, pinned_view_names) {
  for (const name of pinned_view_names) {
    dv.paragraph(`[[${VIEWS_PATH}/${name} | 🖈 ${name.replace(" ", "/")}]]`);
  }
  let view_names = getAllViews();
  view_names = [...view_names.initiated, ...view_names.uninitiated];
  if (MERGE_VIEWS_IN_LIST) {
    view_names = view_names.sort();
  }
  for (const name of view_names) {
    if (pinned_view_names.includes(name)) {
      continue;
    }
    dv.paragraph(`[[${VIEWS_PATH}/${name} | ${name.replace(" ", "/")}]]`);
  }
}
module.exports.renderViewsList = renderViewsList;

/**
 * Renders a button using the Dataview plugin to create a new thing.
 * @param dv
 * The Dataview plugin's API.
 * @param {string | undefined} button_text
 * The text content of the button.
 * `"Add Thing"` is used if not specified.
 */
function renderAddThingButton(dv, button_text = "Add Thing") {
  /** @type {HTMLButtonElement} */
  const button = dv.el("button", button_text);
  button.addEventListener("click", async () => {
    try {
      await app.vault.createFolder(THINGS_PATH);
    } catch {}
    try {
      await app.vault.create(THINGS_PATH + "/Untitled.md", "");
    } catch {}
    const new_thing = app.vault.getFileByPath(THINGS_PATH + "/Untitled.md");
    app.workspace.activeLeaf.openFile(new_thing);
  });
}
module.exports.renderAddThingButton = renderAddThingButton;

/**
 * Renders a Dataview plugin table with all the things for a view.
 * @param dv
 * The Dataview plugin's API.
 * @param {ViewName | undefined} view_name
 * `dv.current().file.name` is used if not specified.
 */
function renderViewTable(dv, view_name = undefined) {
  if (view_name === undefined) {
    view_name = dv.current().file.name;
  }
  dv.table(
    ["", "Name", "Description", "Tags", "URL", "Created date", "Modified date"],
    dv
      .pages(`"${THINGS_PATH}"`)
      .where((file) => viewMatchesTags(view_name, file.tags))
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
        const created_date = file.ctime;
        const modified_date = file.mtime;
        return [
          icon,
          name,
          description,
          tags,
          url,
          created_date,
          modified_date,
        ];
      }),
  );
}
module.exports.renderViewTable = renderViewTable;

/**
 * Renders an icon/image using the Dataview plugin.
 * @param dv
 * The Dataview plugin's API.
 * @param {string | undefined} icon_link
 * `dv.current().icon` is used if not specified.
 * @param {string | undefined} width
 * `"32px"` is used if not specified.
 * @param {string} height
 * `"32px"` is used if not specified.
 */
function renderIcon(
  dv,
  icon_link = undefined,
  width = "32px",
  height = "32px",
) {
  if (icon_link === undefined) {
    icon_link = dv.current().icon;
  }
  if (icon_link) {
    dv.span(
      `<img src="${icon_link}" style="width:${width};height:${height}"></img>`,
    );
  }
}
module.exports.renderIcon = renderIcon;

/**
 * Checks if view matches the tags.
 * @param {ViewName} view_name
 * The name of the view to check.
 * @param {TagName[]} tag_names
 * An array of tag names to check.
 * @returns {boolean}
 * If a view matches the tags.
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
module.exports.viewMatchesTags = viewMatchesTags;

/**
 * Checks if a regular (not custom) view matches at least one tag.
 * @param {ViewName} view_name
 * The name of the view to check.
 * Subfolders and a "/" prefix will be ignored.
 * @param {TagName[]} tag_names
 * An array of tag names to check.
 * @returns {boolean}
 * If a view matches at least one tag.
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
module.exports.regularViewMatchesTags = regularViewMatchesTags;

/**
 * @returns {{initiated: ViewName[], uninitiated: ViewName[]}}
 * The names of all initiated and uninitiated views.
 * An initiated view is a view with an existing file, while an uninitiated
 *  view is a view which we know can exist (has tags or custom views) but
 *  their file hasn't been created yet.
 */
function getAllViews() {
  const initiated_view_names = getInitiatedViewNames().sort();

  let uninitiated_view_names = [];
  const existing_tag_names = getExistingTagNames();
  const user_custom_view_names = Object.keys(CUSTOM_VIEWS);
  const core_custom_view_names = Object.keys(CORE_CUSTOM_VIEWS);
  const user_custom_tag_names = Object.keys(CUSTOM_TAGS);
  const core_custom_tag_names = Object.keys(CORE_CUSTOM_TAGS);
  const possible_uninitiated_view_name_arrays = [
    existing_tag_names.map((name) => name.replace("/", " ")),
    user_custom_view_names,
    core_custom_view_names,
    user_custom_tag_names.map((name) => name.replace("/", " ")),
    core_custom_tag_names.map((name) => name.replace("/", " ")),
  ];
  for (const array of possible_uninitiated_view_name_arrays) {
    for (const name of array) {
      if (
        !uninitiated_view_names.includes(name) &&
        !initiated_view_names.includes(name)
      ) {
        uninitiated_view_names.push(name);
      }
    }
  }
  uninitiated_view_names = uninitiated_view_names.sort();
  return {
    initiated: initiated_view_names,
    uninitiated: uninitiated_view_names,
  };
}
module.exports.getAllViews = getAllViews;

/**
 * @returns {TagName[]}
 * A list of all regular (not custom) `TagName`s.
 */
function getExistingTagNames() {
  const tag_counts = app.metadataCache.getTags();
  const tag_names_with_hashtag = Object.keys(tag_counts);
  const tag_names = tag_names_with_hashtag.map((tag) => tag.slice(1));
  return tag_names;
}
module.exports.getExistingTagNames = getExistingTagNames;

/**
 * @returns {ViewName[]}
 * The names of all initiated views.
 * An initiated view is a view with an existing file, while an uninitiated
 *  view is a view which we know can exist (has tags or custom views) but
 *  their file hasn't been created yet.
 */
function getInitiatedViewNames() {
  const files = app.vault.getFiles();
  const view_files = files.filter((file) => file.parent.path === VIEWS_PATH);
  const views = view_files.map((file) => file.basename);
  return views;
}
module.exports.getInitiatedViewNames = getInitiatedViewNames;

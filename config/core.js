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
 * The path doesn't start with a "/" except in `CustomViews` where that has
 *  a special meaning.
 * Regular `ViewName` are `TagName` with the tag's "/" replaced by " ",
 *  because tags can't contain " " so there is no risk of confusion, and in
 *  view names the "/" are the separation between subfolders in the path.
 */

/**
 * @typedef TagName
 * @type {string}
 * An Obsidian tag without the "#" prefix.
 * These tags can't contain " " and use "/" to show subtags.
 */

/**
 * @typedef CustomViews
 * @type {{ [x: ViewName]: (tag_names: TagName[]) => boolean }}
 * Views where you can set what things they will try to show.
 * Matching things can be excluded from a view by using `CustomTags`.
 * The keys are `ViewName`s, and can either replace a regular view or be
 *  something completely new.
 * If a `ViewName` starts with "/" it means that it only appears on the
 *  specified location, be it root or subfolder.
 * If a `ViewName` doesn't start with "/" it means that it appears on all
 *  locations ending with the `ViewName`, meaning on root and every subfolder
 *  if no subfolder is specified, or every subfolder with the same name if a
 *  subfolder is specified.
 * The values are functions to check if a thing belongs to the view.
 */

/**
 * @typedef CustomTags
 * @type {{ [x: TagName]: (view_name: ViewName) => boolean }}
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

// =========================== //
// Functions used in `Home.md` //
// =========================== //

/**
 * Renders a list with all views.
 * @param dv
 * The Dataview plugin's API.
 * @param {Object} [kwargs]
 * @param {ViewName[] | undefined} [kwargs.pinned_view_names]
 * The names of all the views to be pinned to the top.
 * `[]` is used if not specified.
 * @param {boolean} [kwargs.replace_spaces_with_slashes]
 * If the " " in view names are replaced with "/".
 * Can be confusing if subfolders are being used.
 * `true` is used if not specified.
 * @param {string} [kwargs.views_path]
 * The location of the views.
 * `VIEWS_PATH` is used if not specified.
 * @param {string} [kwargs.things_path]
 * The location of the things.
 * `THINGS_PATH` is used if not specified.
 * @param {boolean} [kwargs.merge_views]
 * If initiated and uninitiated views are rendered mixed or if initiated are
 *  rendered above uninitiated.
 * `MERGE_VIEWS_IN_LIST` is used if not specified.
 * @param {boolean} [kwargs.calculate_subfolder_uninitiated]
 * If uninitiated subfolder views are calculated, instead of just getting the
 *  root uninitiated views at `kwargs.views_path`.
 * `true` is used if unspecified.
 * @param {CustomViews} [kwargs.custom_views]
 * The user defined custom views.
 * `CUSTOM_VIEWS` is used if not specified.
 * @param {CustomTags} [kwargs.custom_tags]
 * The user defined custom tags.
 * `CUSTOM_TAGS` is used if not specified.
 */
function renderViewsList(dv, kwargs) {
  let pinned_view_names = [];
  let replace_spaces_with_slashes = true;
  let views_path = VIEWS_PATH;
  let merge_views = MERGE_VIEWS_IN_LIST;
  // The following have the defaults set on `getAllViews`
  let calculate_subfolder_uninitiated;
  let things_path;
  let custom_views;
  let custom_tags;
  if (kwargs !== undefined) {
    if (kwargs.pinned_view_names !== undefined) {
      pinned_view_names = kwargs.pinned_view_names;
    }
    if (kwargs.replace_spaces_with_slashes !== undefined) {
      replace_spaces_with_slashes = kwargs.replace_spaces_with_slashes;
    }
    if (kwargs.views_path !== undefined) {
      views_path = kwargs.views_path;
    }
    if (kwargs.merge_views !== undefined) {
      merge_views = kwargs.merge_views;
    }
    if (kwargs.calculate_subfolder_uninitiated !== undefined) {
      calculate_subfolder_uninitiated = kwargs.calculate_subfolder_uninitiated;
    }
    if (kwargs.things_path !== undefined) {
      things_path = kwargs.things_path;
    }
    if (kwargs.custom_views !== undefined) {
      custom_views = kwargs.custom_views;
    }
    if (kwargs.custom_tags !== undefined) {
      custom_tags = kwargs.custom_tags;
    }
  }
  views_path = trimSlashes(views_path);
  for (const name of pinned_view_names) {
    let displayed_name = name;
    if (replace_spaces_with_slashes) {
      displayed_name = name.replace(" ", "/");
    }
    dv.paragraph(`[[${views_path}/${name} | 🖈 ${displayed_name}]]`);
  }
  let view_names = getAllViews({
    calculate_subfolder_uninitiated,
    views_path,
    things_path,
    custom_views,
    custom_tags,
  });
  view_names = [...view_names.initiated, ...view_names.uninitiated];
  if (merge_views) {
    view_names = view_names.sort();
  }
  for (const name of view_names) {
    if (pinned_view_names.includes(name)) {
      continue;
    }
    let displayed_name = name;
    if (replace_spaces_with_slashes) {
      displayed_name = name.replace(" ", "/");
    }
    dv.paragraph(`[[${views_path}/${name} | ${displayed_name}]]`);
  }
}
module.exports.renderViewsList = renderViewsList;

/**
 * Renders a button using the Dataview plugin to create a new thing.
 * @param dv
 * The Dataview plugin's API.
 * @param {Object} [kwargs]
 * @param {string} [kwargs.button_text]
 * The text content of the button.
 * `"Add Thing"` is used if not specified.
 * @param {string} [kwargs.things_path]
 * The location where the new thing is created.
 * `THINGS_PATH` is used if not specified.
 * @param {string} [kwargs.thing_name]
 * The default file name of the new thing without the ".md" extension.
 * `"Untitled"` is used if not specified.
 */
function renderAddThingButton(dv, kwargs) {
  let button_text = "Add Thing";
  let things_path = THINGS_PATH;
  let thing_name = "Untitled";
  if (kwargs !== undefined) {
    if (kwargs.button_text !== undefined) {
      button_text = kwargs.button_text;
    }
    if (kwargs.things_path !== undefined) {
      things_path = kwargs.things_path;
    }
    if (kwargs.thing_name !== undefined) {
      thing_name = kwargs.thing_name;
    }
  }
  things_path = trimSlashes(things_path);
  /** @type {HTMLButtonElement} */
  const button = dv.el("button", button_text);
  button.addEventListener("click", async () => {
    try {
      await app.vault.createFolder(things_path);
    } catch (e) {
      console.warn(e);
    }
    try {
      await app.vault.create(things_path + `/${thing_name}.md`, "");
    } catch (e) {
      console.warn(e);
    }
    const new_thing = app.vault.getFileByPath(
      things_path + `/${thing_name}.md`,
    );
    app.workspace.activeLeaf.openFile(new_thing);
  });
}
module.exports.renderAddThingButton = renderAddThingButton;

// =========================== //
// Functions used in `view.md` //
// =========================== //

/**
 * Renders a Dataview plugin table with all the things for a view.
 * @param dv
 * The Dataview plugin's API.
 * @param {Object} kwargs
 * @param {string} [kwargs.things_path]
 * The location of the things.
 * `THINGS_PATH` is used if not specified.
 * @param {ViewName | undefined} [kwargs.view_name]
 * `dv.current().file.path.slice(VIEWS_PATH.length + 1, -3)` is used if not specified.
 * @param {(file)=>any} [kwargs.tableSort]
 * A callback that takes a Dataview plugin's file and returns something sortable
 *  in order to sort the table.
 * `(file) => file.file.name` is used if not specified.
 * @param {{ [column_name: string]: ((file)=>string) | undefined }} [kwargs.table_columns]
 * A dictionary of callbacks where each key is a column name and each callback
 *  takes a Dataview plugin's file and returns what is rendered on the column
 *  for each file.
 * Set a default `column_name` to undefined to remove it.
 * Default `column_name`s are "" for an icon, "Name", "Description", "Tags",
 *  "URL", "Created date", and "Modified date".
 * @param {CustomViews} [kwargs.custom_views]
 * The user defined custom views.
 * `CUSTOM_VIEWS` is used if not specified.
 * @param {CustomTags} [kwargs.custom_tags]
 * The user defined custom tags.
 * `CUSTOM_TAGS` is used if not specified.
 */
function renderViewTable(dv, kwargs) {
  let things_path = THINGS_PATH;
  let view_name = dv
    .current()
    .file.path.slice(trimSlashes(VIEWS_PATH).length + 1, -3);
  let tableSort = (file) => file.file.name;
  let table_columns = {
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
  // The following have the defaults set on `viewMatchesTags`
  let custom_views;
  let custom_tags;
  if (kwargs !== undefined) {
    if (kwargs.things_path !== undefined) {
      things_path = kwargs.things_path;
    }
    if (kwargs.view_name !== undefined) {
      view_name = trimSlashes(kwargs.view_name);
    }
    if (kwargs.tableSort !== undefined) {
      tableSort = kwargs.tableSort;
    }
    if (kwargs.table_columns !== undefined) {
      for (const column_name of kwargs.table_columns) {
        table_columns[column_name] = kwargs.table_columns[column_name];
      }
    }
    if (kwargs.custom_views !== undefined) {
      custom_views = kwargs.custom_views;
    }
    if (kwargs.custom_tags !== undefined) {
      custom_tags = kwargs.custom_tags;
    }
  }
  // Remove undefined table columns
  const table_column_names = Object.keys(table_columns).filter(
    (column_name) => table_columns[column_name],
  );
  dv.table(
    table_column_names,
    dv
      .pages(`"${things_path}"`)
      .where((file) =>
        viewMatchesTags(view_name, file.tags, { custom_views, custom_tags }),
      )
      .sort(tableSort)
      .map((file) => {
        return table_column_names.map((column_name) =>
          table_columns[column_name](file),
        );
      }),
  );
}
module.exports.renderViewTable = renderViewTable;

// ============================ //
// Functions used in `thing.md` //
// ============================ //

/**
 * Renders an icon/image using the Dataview plugin.
 * @param dv
 * The Dataview plugin's API.
 * @param {Object} [kwargs]
 * @param {string} [kwargs.icon_link]
 * `dv.current().icon` is used if not specified.
 * @param {string} [kwargs.width]
 * `"32px"` is used if not specified.
 * @param {string} [kwargs.height]
 * `"32px"` is used if not specified.
 */
function renderIcon(dv, kwargs) {
  let icon_link = dv.current().icon;
  let width = "32px";
  let height = "32px";
  if (kwargs !== undefined) {
    if (kwargs.icon_link !== undefined) {
      icon_link = kwargs.icon_link;
    }
    if (kwargs.width !== undefined) {
      width = kwargs.width;
    }
    if (kwargs.height !== undefined) {
      height = kwargs.height;
    }
  }
  if (icon_link) {
    dv.span(
      `<img src="${icon_link}" style="width:${width};height:${height}"></img>`,
    );
  }
}
module.exports.renderIcon = renderIcon;

// ================================================= //
// Utility functions not called in any markdown file //
// ================================================= //

/**
 * Checks if view matches the tags.
 * @param {ViewName} view_name
 * The name of the view to check.
 * @param {TagName[]} tag_names
 * An array of tag names to check.
 * @param {Object} [kwargs]
 * @param {CustomViews} [kwargs.custom_views]
 * The user defined custom views.
 * `CUSTOM_VIEWS` is used if not specified.
 * @param {CustomTags} [kwargs.custom_tags]
 * The user defined custom tags.
 * `CUSTOM_TAGS` is used if not specified.
 * @returns {boolean}
 * If a view matches the tags.
 */
function viewMatchesTags(view_name, tag_names, kwargs) {
  let custom_views = CUSTOM_VIEWS;
  let custom_tags = CUSTOM_TAGS;
  if (kwargs !== undefined) {
    if (kwargs.custom_views !== undefined) {
      custom_views = kwargs.custom_views;
    }
    if (kwargs.custom_tags !== undefined) {
      custom_tags = kwargs.custom_tags;
    }
  }
  // When there are no tags, the Dataview plugin's file returns null instead of []
  if (tag_names == null) {
    tag_names = [];
  }
  view_name = trimSlashes(view_name);

  // If a custom tag matches one of the tag_names,
  // both the functions from the custom tags and the custom/regular view
  // need to be true for all tags for a thing to show on a view.

  const user_custom_tag_names = Object.keys(custom_tags);
  const core_custom_tag_names = Object.keys(CORE_CUSTOM_TAGS);
  for (const tag_name of tag_names) {
    // Let user custom tags overwrite core custom tags.
    if (user_custom_tag_names.includes(tag_name)) {
      if (!custom_tags[tag_name](view_name)) {
        return false;
      }
    } else if (core_custom_tag_names.includes(tag_name)) {
      if (!CORE_CUSTOM_TAGS[tag_name](view_name)) {
        return false;
      }
    }
  }

  // Add all variations of the view_name that could match a custom view
  let matching_view_names = [];
  matching_view_names.push("/" + view_name);
  const view_name_split = view_name.split("/");
  matching_view_names.unshift(view_name_split.pop());
  while (view_name_split.length > 0) {
    matching_view_names.unshift(
      view_name_split.pop() + "/" + matching_view_names[0],
    );
  }

  const user_custom_view_names = Object.keys(custom_views);
  const core_custom_view_names = Object.keys(CORE_CUSTOM_VIEWS);
  // Let user custom views overwrite core custom views.
  for (const matching_view_name of matching_view_names) {
    if (user_custom_view_names.includes(matching_view_name)) {
      return custom_views[matching_view_name](tag_names);
    } else if (core_custom_view_names.includes(matching_view_name)) {
      return CORE_CUSTOM_VIEWS[matching_view_name](tag_names);
    }
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
  view_name = trimSlashes(view_name);
  // Ignore subfolders and "/" prefix
  const split_view_name = view_name.split("/");
  view_name = split_view_name[split_view_name.length - 1];
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
 * Returns the names of initiated and uninitiated views at the specified paths.
 * An initiated view is a view with an existing file, while an uninitiated
 *  view is a view which we know can exist (has tags or custom views) but
 *  their file hasn't been created yet.
 * @param {Object} [kwargs]
 * @param {boolean} [kwargs.calculate_subfolder_uninitiated]
 * If uninitiated subfolder views are calculated, instead of just getting the
 *  root uninitiated views at `kwargs.views_path`.
 * `true` is used if unspecified.
 * @param {string} [kwargs.views_path]
 * The location of the views.
 * `VIEWS_PATH` is used if unspecified.
 * @param {string} [kwargs.things_path]
 * The location of the things.
 * `THINGS_PATH` is used if not specified.
 * @param {CustomViews} [kwargs.custom_views]
 * The user defined custom views.
 * `CUSTOM_VIEWS` is used if not specified.
 * @param {CustomTags} [kwargs.custom_tags]
 * The user defined custom tags.
 * `CUSTOM_TAGS` is used if not specified.
 * @returns {{initiated: ViewName[], uninitiated: ViewName[]}}
 */
function getAllViews(kwargs) {
  let calculate_subfolder_uninitiated = true;
  let views_path = VIEWS_PATH;
  let things_path = THINGS_PATH;
  let custom_views = CUSTOM_VIEWS;
  let custom_tags = CUSTOM_TAGS;
  if (kwargs !== undefined) {
    if (kwargs.calculate_subfolder_uninitiated !== undefined) {
      calculate_subfolder_uninitiated = kwargs.calculate_subfolder_uninitiated;
    }
    if (kwargs.views_path !== undefined) {
      views_path = kwargs.views_path;
    }
    if (kwargs.things_path !== undefined) {
      things_path = kwargs.things_path;
    }
    if (kwargs.custom_views !== undefined) {
      custom_views = kwargs.custom_views;
    }
    if (kwargs.custom_tags !== undefined) {
      custom_tags = kwargs.custom_tags;
    }
  }
  views_path = trimSlashes(views_path);
  things_path = trimSlashes(things_path);

  const initiated_view_names = getInitiatedViewNames(views_path).sort();

  let uninitiated_view_names = [];

  let existing_tag_names = getExistingTagNames(things_path);
  existing_tag_names = existing_tag_names.map((name) => name.replace("/", " "));
  if (calculate_subfolder_uninitiated) {
    const files = app.vault.getFiles();
    let thing_subfolder_files = files.filter((file) =>
      // Searching for a "/" so that the path has to have a subfolder
      file.parent.path.startsWith(views_path + "/"),
    );
    const things_path_length = things_path.length + 1;
    let existing_subfolder_tag_names = new Set();
    for (const file of thing_subfolder_files) {
      const frontmatter = app.metadataCache.getFileCache(file).frontmatter;
      if (!frontmatter || !frontmatter.tags || !frontmatter.tags.length > 0) {
        continue;
      }
      const tags = frontmatter.tags.map((name) => name.replace("/", " "));
      const subfolders_array = file.parent.path
        .slice(things_path_length)
        .split("/");
      let full_subfolder = "";
      for (const subfolder of subfolders_array) {
        full_subfolder += subfolder + "/";
        for (const tag of tags) {
          existing_subfolder_tag_names.add(full_subfolder + tag);
        }
      }
    }
    existing_tag_names.push(...existing_subfolder_tag_names);
  }

  const user_custom_view_names = Object.keys(custom_views);
  const core_custom_view_names = Object.keys(CORE_CUSTOM_VIEWS);

  let user_custom_tag_names = Object.keys(custom_tags);
  user_custom_tag_names = user_custom_tag_names.map((name) =>
    name.replace("/", " "),
  );
  let core_custom_tag_names = Object.keys(CORE_CUSTOM_TAGS);
  core_custom_tag_names = core_custom_tag_names.map((name) =>
    name.replace("/", " "),
  );

  const possible_uninitiated_view_name_arrays = [
    existing_tag_names,
    user_custom_view_names,
    core_custom_view_names,
    user_custom_tag_names,
    core_custom_tag_names,
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
 * Returns an array of regular (not custom) `TagName`s.
 * @param {string} [things_path]
 * The location of the things.
 * `THINGS_PATH` is used if not specified.
 * @returns {TagName[]}
 */
function getExistingTagNames(things_path = THINGS_PATH) {
  things_path = trimSlashes(things_path);
  const files = app.vault.getFiles();
  const thing_files = files.filter((file) => file.path.startsWith(things_path));
  let tag_names = new Set();
  for (const file of thing_files) {
    const frontmatter = app.metadataCache.getFileCache(file).frontmatter;
    if (frontmatter && frontmatter.tags && frontmatter.tags.length > 0) {
      tag_names.add(...frontmatter.tags);
    }
  }
  return [...tag_names];
}
module.exports.getExistingTagNames = getExistingTagNames;

/**
 * Returns all initiated views in a folder.
 * An initiated view is a view with an existing file, while an uninitiated
 *  view is a view which we know can exist (has tags or custom views) but
 *  their file hasn't been created yet.
 * @param {string} [views_path]
 * The location/folder of the initiated view names.
 * `VIEWS_PATH` is used if not specified.
 * @returns {ViewName[]}
 * The names of all initiated views.
 */
function getInitiatedViewNames(views_path = VIEWS_PATH) {
  views_path = trimSlashes(views_path);
  const file_paths = app.metadataCache.getCachedFiles();
  // This includes non-markdown files, but I'll assume that if it is in
  // `views_path` its either on purpose or on mistake, which should be
  // shown either way
  const view_paths = file_paths.filter((path) => path.startsWith(views_path));
  const views_path_length = views_path.length + 1;
  const view_names = view_paths.map((path) =>
    // Remove `view_path` prefix and ".md" suffix from the file paths
    path.slice(views_path_length, -3),
  );
  return view_names;
}
module.exports.getInitiatedViewNames = getInitiatedViewNames;

/**
 * @param {string} str
 * The string to trim.
 * @returns {string}
 * The string without "/" at the start and end.
 */
function trimSlashes(str) {
  if (str.startsWith("/")) {
    str = str.slice(1);
  }
  if (str.endsWith("/")) {
    str = str.slice(0, -1);
  }
  return str;
}
module.exports.trimSlashes = trimSlashes;

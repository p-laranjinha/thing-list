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
  ALL_NAME,
  UNTAGGED_NAME,
  OTHERS_NAME,
  ARCHIVE_NAME,
  VIEWS_PATH,
  THINGS_PATH,
  ADD_THING_BUTTON_TEXT,
  NEW_THING_NAME,
  PINNED_VIEW_NAME_PREFIX,
  THINGS_PER_PAGE,
  SORTING_LABEL_TEXT,
  THINGS_PER_PAGE_LABEL_TEXT,
  PAGE_SELECTION_LABEL_TEXT,
  PREVIOUS_PAGE_BUTTON_TEXT,
  NEXT_PAGE_BUTTON_TEXT,
  ASCENDING_SUFFIX,
  DESCENDING_SUFFIX,
  RENDER_ICON_LINK_PROPERTY,
  RENDER_ICON_WIDTH,
  RENDER_ICON_HEIGHT,
  MERGE_VIEWS_IN_LIST,
  REPLACE_VIEW_SPACES_WITH_SLASHES,
  PINNED_VIEW_NAMES,
  CALCULATE_SUBFOLDER_UNINITIATED,
  TABLE_SORTS,
  TABLE_COLUMNS,
  CUSTOM_VIEWS,
  CUSTOM_TAGS,
} = require("./user.js");

/** @type {CustomViews} */
const CORE_CUSTOM_VIEWS = {
  [ALL_NAME]: (_) => true,
  [UNTAGGED_NAME]: (tag_names) => tag_names.length === 0,
  [OTHERS_NAME]: (tag_names) => {
    const core_custom_view_names = Object.keys(CORE_CUSTOM_VIEWS);
    const user_custom_view_names = Object.keys(CUSTOM_VIEWS);
    for (const view_name of getInitiatedViewNames()) {
      // Ignore all core custom views in "Others"
      if (core_custom_view_names.includes(view_name)) {
        continue;
      }
      // If a regular or custom view matches, it doesn't show on the "Others" view
      if (
        (user_custom_view_names.includes(view_name) &&
          CUSTOM_VIEWS[view_name](tag_names)) ||
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
  [ARCHIVE_NAME]: (view_name) => view_name === "Archive",
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
 * `PINNED_VIEW_NAMES` is used if not specified.
 * @param {string} [kwargs.pinned_prefix]
 * A prefix to add to all pinned view names.
 * `PINNED_VIEW_NAME_PREFIX` is used if not specified.
 * @param {boolean} [kwargs.replace_spaces_with_slashes]
 * If the " " in view names are replaced with "/".
 * Can be confusing if subfolders are being used.
 * `REPLACE_VIEW_SPACES_WITH_SLASHES` is used if not specified.
 * @param {string} [kwargs.views_path]
 * The location of the views.
 * `VIEWS_PATH` is used if not specified.
 * @param {string} [kwargs.things_path]
 * The location of the things.
 * `THINGS_PATH` is used if not specified.
 * @param {boolean} [kwargs.merge_views]
 * If initiated and uninitiated views are rendered mixed or if initiated are
 *  rendered above uninitiated.
 * An initiated view is a view with an existing file, while an uninitiated
 *  view is a view which we know can exist (has tags or custom views) but
 *  their file hasn't been created yet.
 * `MERGE_VIEWS_IN_LIST` is used if not specified.
 * @param {boolean} [kwargs.calculate_subfolder_uninitiated]
 * If uninitiated subfolder views are calculated, instead of just getting the
 *  root uninitiated views at `kwargs.views_path`.
 * `CALCULATE_SUBFOLDER_UNINITIATED` is used if unspecified.
 * @param {CustomViews} [kwargs.custom_views]
 * The user defined custom views.
 * `CUSTOM_VIEWS` is used if not specified.
 * @param {CustomTags} [kwargs.custom_tags]
 * The user defined custom tags.
 * `CUSTOM_TAGS` is used if not specified.
 */
function renderViewsList(dv, kwargs) {
  let pinned_view_names = PINNED_VIEW_NAMES;
  let pinned_prefix = PINNED_VIEW_NAME_PREFIX;
  let replace_spaces_with_slashes = REPLACE_VIEW_SPACES_WITH_SLASHES;
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
    if (kwargs.pinned_prefix !== undefined) {
      pinned_prefix = kwargs.pinned_prefix;
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
      displayed_name = name.replaceAll(" ", "/");
    }
    dv.paragraph(
      `[[${views_path}/${name} | ${pinned_prefix}${displayed_name}]]`,
    );
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
      displayed_name = name.replaceAll(" ", "/");
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
 * `ADD_THING_BUTTON_TEXT` is used if not specified.
 * @param {string} [kwargs.things_path]
 * The location where the new thing is created.
 * `THINGS_PATH` is used if not specified.
 * @param {string} [kwargs.thing_name]
 * The default file name of the new thing without the ".md" extension.
 * `NEW_THING_NAME` is used if not specified.
 */
function renderAddThingButton(dv, kwargs) {
  let button_text = ADD_THING_BUTTON_TEXT;
  let things_path = THINGS_PATH;
  let thing_name = NEW_THING_NAME;
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
 * This table includes a sorting dropdown selector and pagination.
 * This function is `async` because some workarounds are required to replace the
 *  table when sorting or the page changes. If `await` is not used, any further
 *  elements created using Dataview may be deleted when the table is replaced.
 * @param dv
 * The Dataview plugin's API.
 * @param {Object} kwargs
 * @param {string} [kwargs.things_path]
 * The location of the things.
 * `THINGS_PATH + dv.current().file.folder.slice(trimSlashes(VIEWS_PATH).length)`
 *  is used if not specified.
 * @param {ViewName | undefined} [kwargs.view_name]
 * `dv.current().file.path.slice(VIEWS_PATH.length + 1, -3)` is used if not specified.
 * @param {number} [kwargs.things_per_page]
 * How many things are shown each page.
 * `THINGS_PER_PAGE` is used if not specified.
 * @param {string} [kwargs.sorting_label_text]
 * The label used for the sorting dropdown.
 * `SORTING_LABEL_TEXT` is used if not specified.
 * @param {string} [kwargs.things_per_page_label_text]
 * The label used for the input that changes how many things are shown each page.
 * `THINGS_PER_PAGE_LABEL_TEXT` is used if not specified.
 * @param {string} [kwargs.page_selection_label_text]
 * The label used for the inputs that change what page is currently being shown.
 * `PAGE_SELECTION_LABEL_TEXT` is used if not specified.
 * @param {string} [kwargs.previous_page_button_text]
 * The text for the button that changes the page being shown to the previous one.
 * `PREVIOUS_PAGE_BUTTON_TEXT` is used if not specified.
 * @param {string} [kwargs.next_page_button_text]
 * The text for the button that changes the page being shown to the next one.
 * `NEXT_PAGE_BUTTON_TEXT` is used if not specified.
 * @param {string} [kwargs.ascending_suffix]
 * The suffix added to every option of the sorting dropdown that keeps the sorting order.
 * `ASCENDING_SUFFIX` is used if not specified.
 * @param {string} [kwargs.descending_suffix]
 * The suffix added to every option of the sorting dropdown that reverses the sorting order.
 * `DESCENDING_SUFFIX` is used if not specified.
 * @param {{ [sort_name: string]: ((file)=>any) | undefined }} [kwargs.table_sorts]
 * A dictionary of callbacks where each key is a name and each value is a
 *  callback that takes a Dataview plugin's file and returns something sortable
 *  in order to sort the table.
 * The first entry in this dictionary is the default sort.
 * `kwargs.table_columns` are included in this dictionary but can be
 *  overwritten by using the same key, and deleted if the value is undefined.
 * Default sorts are `TABLE_SORTS`.
 * @param {{ [column_name: string]: ((file)=>string) | undefined }} [kwargs.table_columns]
 * A dictionary of callbacks where each key is a column name and each callback
 *  takes a Dataview plugin's file and returns what is rendered on the column
 *  for each file.
 * Default columns are `TABLE_COLUMNS`.
 * @param {CustomViews} [kwargs.custom_views]
 * The user defined custom views.
 * `CUSTOM_VIEWS` is used if not specified.
 * @param {CustomTags} [kwargs.custom_tags]
 * The user defined custom tags.
 * `CUSTOM_TAGS` is used if not specified.
 */
async function renderThingsTable(dv, kwargs) {
  let things_path =
    THINGS_PATH +
    dv.current().file.folder.slice(trimSlashes(VIEWS_PATH).length);
  let view_name = dv
    .current()
    .file.path.slice(trimSlashes(VIEWS_PATH).length + 1, -3);
  let things_per_page = THINGS_PER_PAGE;
  let sorting_label_text = SORTING_LABEL_TEXT;
  let things_per_page_label_text = THINGS_PER_PAGE_LABEL_TEXT;
  let page_selection_label_text = PAGE_SELECTION_LABEL_TEXT;
  let previous_page_button_text = PREVIOUS_PAGE_BUTTON_TEXT;
  let next_page_button_text = NEXT_PAGE_BUTTON_TEXT;
  let ascending_suffix = ASCENDING_SUFFIX;
  let descending_suffix = DESCENDING_SUFFIX;
  // Clone object with functions
  let table_sorts = Object.assign({}, TABLE_SORTS);
  // Clone object with functions
  let table_columns = Object.assign({}, TABLE_COLUMNS);
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
    if (kwargs.things_per_page !== undefined) {
      things_per_page = kwargs.things_per_page;
    }
    if (kwargs.sorting_label_text !== undefined) {
      sorting_label_text = kwargs.sorting_label_text;
    }
    if (kwargs.things_per_page_label_text !== undefined) {
      things_per_page_label_text = kwargs.things_per_page_label_text;
    }
    if (kwargs.page_selection_label_text !== undefined) {
      page_selection_label_text = kwargs.page_selection_label_text;
    }
    if (kwargs.previous_page_button_text !== undefined) {
      previous_page_button_text = kwargs.previous_page_button_text;
    }
    if (kwargs.next_page_button_text !== undefined) {
      next_page_button_text = kwargs.next_page_button_text;
    }
    if (kwargs.ascending_suffix !== undefined) {
      ascending_suffix = kwargs.ascending_suffix;
    }
    if (kwargs.descending_suffix !== undefined) {
      descending_suffix = kwargs.descending_suffix;
    }
    if (kwargs.table_sorts !== undefined) {
      table_sorts = kwargs.table_sorts;
    }
    if (kwargs.table_columns !== undefined) {
      table_columns = kwargs.table_columns;
    }
    if (kwargs.custom_views !== undefined) {
      custom_views = kwargs.custom_views;
    }
    if (kwargs.custom_tags !== undefined) {
      custom_tags = kwargs.custom_tags;
    }
  }

  const table_column_names = Object.keys(table_columns);

  // Add non-overwritten table columns to sorts
  let table_sort_names = Object.keys(table_sorts);
  for (const column_name of table_column_names) {
    if (!table_sort_names.includes(column_name)) {
      table_sorts[column_name] = table_columns[column_name];
    }
  }
  // Remove undefined table sorts
  table_sort_names = Object.keys(table_sorts).filter(
    (sort_name) => table_sorts[sort_name] !== undefined,
  );

  let all_things = dv
    .pages(`"${things_path}"`)
    .where((file) =>
      viewMatchesTags(view_name, file.tags, { custom_views, custom_tags }),
    );

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.gap = "16px";
  container.style.alignItems = "center";
  container.style.flexWrap = "wrap";
  container.style.minHeight = "40px";
  dv.container.append(container);

  // Sorting elements

  const sorting_container = document.createElement("div");
  sorting_container.style.display = "flex";
  sorting_container.style.gap = "4px";
  sorting_container.style.alignItems = "center";
  container.append(sorting_container);

  const sorting_label = document.createElement("label");
  sorting_label.innerText = sorting_label_text;
  sorting_container.append(sorting_label);

  const sorting_select = document.createElement("select");
  sorting_select.classList.add("dropdown");
  sorting_container.append(sorting_select);
  for (const sort_name of table_sort_names) {
    for (const order_suffix of [ascending_suffix, descending_suffix]) {
      const sorting_option = document.createElement("option");
      sorting_option.value = sort_name + order_suffix;
      sorting_option.innerText = sort_name + order_suffix;
      sorting_select.append(sorting_option);
    }
  }

  // Things per page elements

  const things_per_page_container = document.createElement("div");
  things_per_page_container.style.display = "flex";
  things_per_page_container.style.gap = "4px";
  things_per_page_container.style.alignItems = "center";
  container.append(things_per_page_container);

  const things_per_page_label = document.createElement("label");
  things_per_page_label.innerText = things_per_page_label_text;
  things_per_page_container.append(things_per_page_label);

  const things_per_page_input = document.createElement("input");
  things_per_page_input.type = "number";
  things_per_page_input.min = 1;
  things_per_page_input.value = things_per_page;
  things_per_page_container.append(things_per_page_input);

  // Page selection elements

  const page_selection_container = document.createElement("div");
  page_selection_container.style.display = "flex";
  page_selection_container.style.gap = "4px";
  page_selection_container.style.alignItems = "center";
  container.append(page_selection_container);

  let page_count = Math.max(
    1,
    Math.ceil(all_things.length / things_per_page_input.value),
  );

  const page_selection_label = document.createElement("label");
  page_selection_label.innerText = page_selection_label_text;
  page_selection_container.append(page_selection_label);

  const previous_page_button = document.createElement("button");
  previous_page_button.innerText = previous_page_button_text;
  previous_page_button.disabled = true;
  page_selection_container.append(previous_page_button);

  const page_selection_input_container = document.createElement("div");
  page_selection_input_container.style.position = "relative";
  page_selection_container.append(page_selection_input_container);
  const page_selection_input = document.createElement("input");
  page_selection_input.type = "number";
  page_selection_input.min = 1;
  page_selection_input.max = page_count;
  page_selection_input.value = 1;
  page_selection_input_container.append(page_selection_input);
  const page_selection_input_suffix = document.createElement("span");
  page_selection_input_suffix.innerText = "/" + page_count;
  page_selection_input_suffix.style.fontSize = "var(--font-ui-small)";
  page_selection_input_suffix.style.position = "absolute";
  page_selection_input_suffix.style.right = "var(--size-4-2)";
  page_selection_input_suffix.style.height = "var(--input-height)";
  page_selection_input_suffix.style.lineHeight = "var(--input-height)";
  page_selection_input_container.append(page_selection_input_suffix);

  const next_page_button = document.createElement("button");
  next_page_button.innerText = next_page_button_text;
  if (page_count <= 1) {
    next_page_button.disabled = true;
  }
  page_selection_container.append(next_page_button);

  // Function to render table

  const table_container = document.createElement("div");
  table_container.style.overflowX = "auto";
  dv.container.append(table_container);
  async function renderTable() {
    // Remove old table and any other elements in `table_container`.
    table_container.replaceChildren();
    const is_descending = sorting_select.value.endsWith(descending_suffix);
    if (is_descending) {
      all_things = all_things.sort(
        table_sorts[
          sorting_select.value.slice(0, -1 * descending_suffix.length)
        ],
        "desc",
      );
    } else {
      all_things = all_things.sort(
        table_sorts[
          sorting_select.value.slice(0, -1 * ascending_suffix.length)
        ],
      );
    }
    const start_index =
      things_per_page_input.value * (page_selection_input.value - 1);
    const end_index = things_per_page_input.value * page_selection_input.value;
    const things = all_things.slice(start_index, end_index);

    // Change `dv.container` so we know where the table is at and can remove it.
    // If `await` was not used, elements from outside this function may be
    //  added to `table_container` and removed.
    const real_dv_container = dv.container;
    dv.container = table_container;
    await dv.table(
      table_column_names,
      things.map((file) => {
        return table_column_names.map((column_name) =>
          table_columns[column_name](file),
        );
      }),
    );
    dv.container = real_dv_container;
  }
  await renderTable();

  // Event listeners for the inputs

  page_selection_input.addEventListener("change", renderTable);
  sorting_select.addEventListener("change", () => {
    page_selection_input.value = 1;
    previous_page_button.disabled = true;
    if (page_count <= 1) {
      next_page_button.disabled = true;
    } else {
      next_page_button.disabled = false;
    }
    renderTable();
  });
  previous_page_button.addEventListener("click", () => {
    page_selection_input.value =
      Number.parseInt(page_selection_input.value) - 1;
    if (page_selection_input.value <= 1) {
      previous_page_button.disabled = true;
    } else {
      previous_page_button.disabled = false;
    }
    next_page_button.disabled = false;
    renderTable();
  });
  next_page_button.addEventListener("click", () => {
    page_selection_input.value =
      Number.parseInt(page_selection_input.value) + 1;
    if (page_selection_input.value >= page_count) {
      next_page_button.disabled = true;
    } else {
      next_page_button.disabled = false;
    }
    previous_page_button.disabled = false;
    renderTable();
  });
  things_per_page_input.addEventListener("change", () => {
    page_count = Math.max(
      1,
      Math.ceil(all_things.length / things_per_page_input.value),
    );
    page_selection_input.max = page_count;
    if (page_selection_input.value >= page_count) {
      page_selection_input.value = page_count;
      next_page_button.disabled = true;
    } else {
      next_page_button.disabled = false;
    }
    page_selection_input_suffix.innerText = "/" + page_count;
    renderTable();
  });
}
module.exports.renderThingsTable = renderThingsTable;

// ============================ //
// Functions used in `thing.md` //
// ============================ //

/**
 * Renders an icon/image using the Dataview plugin.
 * @param dv
 * The Dataview plugin's API.
 * @param {Object} [kwargs]
 * @param {string} [kwargs.icon_link]
 * `dv.current()[RENDER_ICON_LINK_PROPERTY]` is used if not specified.
 * @param {string} [kwargs.width]
 * `RENDER_ICON_WIDTH` is used if not specified.
 * @param {string} [kwargs.height]
 * `RENDER_ICON_HEIGHT` is used if not specified.
 */
function renderIcon(dv, kwargs) {
  let icon_link = dv.current()[RENDER_ICON_LINK_PROPERTY];
  let width = RENDER_ICON_WIDTH;
  let height = RENDER_ICON_HEIGHT;
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
 * `CALCULATE_SUBFOLDER_UNINITIATED` is used if unspecified.
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
  let calculate_subfolder_uninitiated = CALCULATE_SUBFOLDER_UNINITIATED;
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
      file.parent.path.startsWith(things_path + "/"),
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

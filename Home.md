```dataviewjs
const { renderAddThingButton } = self.require("[[core.js]]");
renderAddThingButton(dv);
```

```dataviewjs
const pinned_view_names = ["All", "Untagged", "Others"];
const { renderViewsList } = self.require("[[core.js]]");
renderViewsList(dv, {pinned_view_names});
```
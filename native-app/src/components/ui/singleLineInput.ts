// For a raw <TextInput> given a fixed height by className (h-10/h-11/h-12).
// Android adds its own vertical padding on top of that height: the value was
// clipped (e.g. "150" cut in half) and could be dragged up and down inside
// the box. No padding + centred text keeps it still and fully visible.
// (The shared <Input> doesn't need this: its fixed height is on a wrapper.)
export const SINGLE_LINE_INPUT = {
  paddingVertical: 0,
  textAlignVertical: 'center',
  includeFontPadding: false,
} as const;

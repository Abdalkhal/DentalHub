import { cssInterop } from "nativewind";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

// NativeWind only maps `className` props onto React Native's built-in
// components; a third-party ScrollView has to be registered, or its
// `className` / `contentContainerClassName` (padding, gaps…) are dropped.
// Import KeyboardAwareScrollView from here, not from the library directly.
cssInterop(KeyboardAwareScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

export { KeyboardAwareScrollView };

import type { RefObject } from "react";
import type { ScrollView, View } from "react-native";

type FieldRef = RefObject<View | null> | View | null;

function resolveView(ref: FieldRef): View | null {
  if (!ref) return null;
  if (typeof ref === "object" && "current" in ref) return ref.current;
  return ref;
}

export function scrollToFormField(
  scrollViewRef: RefObject<ScrollView | null>,
  contentRef: RefObject<View | null>,
  fieldRef: FieldRef,
  offset = 100
): void {
  const content = contentRef.current;
  const field = resolveView(fieldRef);
  if (!content || !field) return;

  requestAnimationFrame(() => {
    field.measureLayout(
      content,
      (_x, y) => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - offset), animated: true });
      },
      () => {}
    );
  });
}

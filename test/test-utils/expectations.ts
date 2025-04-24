export function expectToBeDefined<Element>(
  element: Element | undefined,
): asserts element is Element {
  expect(element).toBeDefined();
}

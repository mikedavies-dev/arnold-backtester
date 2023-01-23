import blessed from 'blessed';

type Screen = ReturnType<typeof blessed.screen>;

export default function layout<T extends blessed.Widgets.BlessedElement>(
  screen: Screen,
  fillElement: T,
) {
  const components: Array<{
    element: blessed.Widgets.BlessedElement;
    height: number;
  }> = [];

  // append to the screen
  screen.append(fillElement);

  fillElement.top = 0;
  fillElement.width = '100%';
  fillElement.bottom = 0;

  function appendInternal<T extends blessed.Widgets.BlessedElement>(
    element: T,
    height: number,
  ) {
    screen.append(element);

    element.left = 0;
    element.height = height;
    element.width = '100%';

    components.unshift({
      element,
      height,
    });

    let bottom = 0;

    components.forEach(({height, element}) => {
      element.bottom = bottom;
      bottom += height;
    });

    fillElement.bottom = bottom;

    return element;
  }

  function append<T extends blessed.Widgets.BlessedElement>(
    element: T,
    height: number,
    split: boolean,
  ) {
    if (split) {
      appendInternal(
        blessed.line({
          orientation: 'horizontal',
          fg: 'grey',
        }),
        1,
      );
    }

    appendInternal(element, height);

    return element;
  }

  const layout = {
    append,
  };

  return [layout, fillElement] as const;
}

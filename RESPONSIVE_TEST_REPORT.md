# Responsive Test Report — v6.4

## Target breakpoints

| Device group | Width | Layout behavior |
|---|---:|---|
| Large Desktop | > 1280px | Sidebar + 4 metric cards + multi-column forms |
| Desktop / Small Notebook | 1025–1280px | Compact sidebar, adaptive settings grid |
| Tablet Landscape | 821–1024px | 2 metric columns, stacked primary content |
| Tablet Portrait | 641–820px | Drawer sidebar, touch-friendly controls |
| Mobile | 431–640px | Single-column forms/cards, internal table scrolling |
| Small Mobile | 361–430px | Single-column date/night selectors and receipt rows |
| Very Small | <= 360px | Reduced padding and compact drawer |

## Safety checks

- CSS parsed with `tinycss2`: 0 parse errors
- Opening/closing braces balanced
- Existing `app.js`, `admin.js`, and `navigation.js`: syntax check passed
- ZIP integrity check passed
- No API / Apps Script / database changes

## Overflow protection added

- `min-width: 0` for nested Grid/Flex children
- Long Thai/English strings use safe wrapping
- File inputs cannot widen forms
- Tables scroll inside `.table-wrap`
- Receipt amounts remain readable without pushing merchant text outside cards
- Sidebar uses `100dvh` and safe-area padding on mobile
- Toast respects mobile safe-area

## Share image

The generated PNG Share Card intentionally keeps its fixed export canvas size so that shared images remain consistent across Desktop, Tablet, and Mobile. It is rendered off-screen and does not affect the responsive page layout.

import 'styled-components';
import type { Theme } from './theme/tokens';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

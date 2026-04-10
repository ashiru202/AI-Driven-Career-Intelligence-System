import { render } from '@testing-library/react';
import App from './App';

test('renders app without crashing', () => {
  render(<App />);
  // Just test that the app renders without throwing an error
  // More specific tests should be in individual component test files
});

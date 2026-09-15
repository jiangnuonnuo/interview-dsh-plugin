import { EntryPanel } from '../features/entry/EntryPanel';
import type { EntryPort } from '../features/entry/entry-port';

export const App = ({ port }: { port: EntryPort }) => {
  return <EntryPanel port={port} />;
};

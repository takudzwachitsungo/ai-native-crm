import { Header } from '../components/Header';
import { Widgets } from '../components/Widgets';

export default function Dashboard() {
  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <Widgets />
      </div>
    </div>
  );
}

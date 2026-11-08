import { api } from '../../api';
import { useAsync } from '../../lib/hooks';
import { useSession } from '../../lib/session';
import { Hero } from './Hero';
import { AudienceCards, DataModel, Hairline, Method, RecordSection, StatsBand, StickySplit } from './Sections';

export default function Home() {
  const { version } = useSession();
  const summary = useAsync(() => api.getSummary(), [version]);
  const audit = useAsync(() => api.listAudit({ sort: '-action_timestamp', page_size: 5 }).then((r) => r.data), [version]);
  return (
    <div className="home">
      <Hero />
      <StickySplit summary={summary.data} />
      <Hairline />
      <AudienceCards summary={summary.data} />
      <DataModel summary={summary.data} />
      <StatsBand state={summary} />
      <RecordSection audit={audit} />
      <Method summary={summary.data} />
    </div>
  );
}

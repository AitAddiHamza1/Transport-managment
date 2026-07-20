import { AppPage } from '../components/shared/page/AppPage';
import { ForbiddenState } from '../components/shared/ForbiddenState';

/** Full /403 route page — accès refusé (permissions insuffisantes). */
export function ForbiddenPage() {
  return (
    <AppPage>
      <ForbiddenState />
    </AppPage>
  );
}

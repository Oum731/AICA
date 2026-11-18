import { Header, Footer } from '@/components/site/Chrome';
import { AdsLoader } from '@/components/site/Ads';
import { ADS } from '@/config';

export default function SiteLayout({ children }) {
  return (<><Header /><main>{children}</main><Footer /><AdsLoader client={ADS.client} /></>);
}

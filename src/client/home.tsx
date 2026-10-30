import { hydrateRoot } from 'react-dom/client';
import { PoolStage } from '../pool/PoolStage';
import './site';

// These sections used to live on the homepage; keep old links working.
const moved: Record<string, string> = {
  '#projects': '/work/',
  '#about': '/about/',
  '#my-story': '/about/#my-story',
  '#outside': '/life/',
  '#contact': '/about/#contact',
};
if (moved[location.hash]) location.replace(moved[location.hash]);

const root = document.getElementById('pool-island');
if (root) hydrateRoot(root, <PoolStage />);

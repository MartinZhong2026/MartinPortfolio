import { hydrateRoot } from 'react-dom/client';
import { PoolStage } from '../pool/PoolStage';
import './site';

const root = document.getElementById('pool-island');
if (root) hydrateRoot(root, <PoolStage />);

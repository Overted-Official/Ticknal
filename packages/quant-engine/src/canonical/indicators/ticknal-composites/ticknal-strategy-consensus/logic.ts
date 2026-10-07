import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { modelSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const votes=['typhon','cerberus','hydra'].map((modelId)=>modelSeries(frame,inputs,modelId,'vote'));
  const observations=frame.bars.map((_,index)=>{
    const present=votes
      .map((series)=>series[index])
      .filter((vote):vote is number=>typeof vote==='number'&&Number.isFinite(vote));
    if(present.length===0)return {total:null,state:null,disagreement:null};
    const total=present.reduce((sum,vote)=>sum+vote,0);
    return {
      total,
      state:total>0?'bullish':total<0?'bearish':'neutral',
      disagreement:1-Math.abs(total)/present.length,
    };
  });
  return {
    'vote-count':observations.map(({total})=>total),
    'consensus-state':observations.map(({state})=>state),
    disagreement:observations.map((observation)=>observation.disagreement),
  };
};
export default compute;

ref = Appbase.ref('try/piano1');
apply = function(cD){ if(cD.count === undefined) cD.count = 1; else cD.count += 1; return {count:cD.count}; };
ref.commitData(apply, function(){},1 );ref.commitData(apply, function(){},2 );ref.commitData(apply, function(){},3);

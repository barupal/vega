import {ref, transform, keyRef, aggrField, sortKey} from './util';

export default function DataScope(scope, entries) {
  this.scope = scope;

  var n = entries.length;
  this.entries = entries; // is this needed? keep for now...
  this.input  = ref(entries[0]);
  this.values = ref(entries[--n]);
  this.output = ref(entries[--n]);
}

var prototype = DataScope.prototype;

prototype.countsRef = function(field, sort) {
  var ds = this,
      cache = ds.counts || (ds.counts = {}),
      v = cache[field], a, p;

  if (!v) {
    p = {
      groupby: ds.scope.fieldRef(field, 'key'),
      pulse: ds.output
    };
    if (sort && sort.field) addSortField(ds.scope, p, sort);
    a = ds.scope.add(transform('Aggregate', p));
    v = ds.scope.add(transform('Collect', {pulse: ref(a)}));
    cache[field] = v = {agg: a, ref: ref(v)};
  } else if (sort && sort.field) {
    addSortField(ds.scope, v.agg.params, sort);
  }

  return v.ref;
};

function addSortField(scope, p, sort) {
  var as = aggrField(sort.op, sort.field), s;

  if (p.ops) {
    for (var i=0, n=p.as.length; i<n; ++i) {
      if (p.as[i] === as) return;
    }
  } else {
    p.ops = ['count'];
    p.fields = ['*'];
    p.as = ['count'];
  }
  p.ops.push((s=sort.op.signal) ? scope.signalRef(s) : sort.op);
  p.fields.push(scope.fieldRef(sort.field));
  p.as.push(as);
}

function cache(ds, name, optype, field, counts) {
  var cache = ds[name] || (ds[name] = {}),
      sort = sortKey(counts),
      k = field + '$' + sort,
      v = cache[k];

  if (!v) {
    var params = counts
      ? {field: keyRef, pulse: ds.countsRef(field, counts)}
      : {field: ds.scope.fieldRef(field), pulse: ds.output};
    if (sort) params.sort = ds.scope.sortRef(counts);
    cache[k] = v = ref(ds.scope.add(transform(optype, params)));
  }
  return v;
}

prototype.extentRef = function(field) {
  return cache(this, 'extent', 'Extent', field, false);
};

prototype.lookupRef = function(field) {
  return cache(this, 'lookup', 'TupleIndex', field, false);
};

prototype.valuesRef = function(field, sort) {
  return cache(this, 'values', 'Values', field, sort || true);
};

prototype.indataRef = function(field) {
  return cache(this, 'indata', 'TupleIndex', field, true);
};
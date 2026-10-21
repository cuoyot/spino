"""Bounded exact memoization for authoring search, with duplicate verification.

This changes no poses or physical criteria. A fresh final scan/native audit is
still required; cached candidate-search results never count as final clearance.
"""
from array import array
from collections import OrderedDict
from copy import deepcopy
import hashlib
import json

import numpy as np


class ExactSolverCache:
    def __init__(self, record, solve, crossings, limit=512):
        self.record, self.original_solve, self.original_crossings = record, solve, crossings
        self.solutions, self.crossings = OrderedDict(), OrderedDict()
        self.limit = limit
        self.stats = {'solveCalls':0,'solveHits':0,'solveDuplicatesChecked':0,
                      'crossingCalls':0,'crossingHits':0,'crossingDuplicatesChecked':0}

    def solve_key(self, record, i, rotation, clearance):
        m = record['metadata']
        values = list(record['wrists'][i])
        values.extend(v for f in range(1,6) for v in record['world'][f][i])
        values.extend(float(m[name][i]) for name in ('active_finger','note_d','pressure'))
        values.extend((record['gathers'][i],record['couplings'][i],float(record['prepare'][i])))
        values.extend(record['notes'][i])
        values.extend(record['pairs'][i]['long_couplings'][f] for f in range(2,6))
        values.extend(v for row in rotation for v in row)
        values.extend(clearance)
        # Doubles preserve every Python scalar and every exact float32 Vector
        # component. No rounding, normalization or octave translation is used.
        return hashlib.sha256(array('d', values).tobytes()).digest()

    @staticmethod
    def context(geometry):
        return {key:deepcopy(geometry[key]) for key in ('thumb_context','long_couplings') if key in geometry}

    @staticmethod
    def restore(geometry, context):
        for key in ('thumb_context','long_couplings'):
            if key in context:geometry[key] = deepcopy(context[key])
            else:geometry.pop(key, None)

    def solve(self, record, i, rotation, thumb_clearance=None):
        if record is not self.record:
            return self.original_solve(record, i, rotation, thumb_clearance)
        clearance = thumb_clearance
        if clearance is None:clearance = record.get('thumb_clearance',[(0,0)]*len(record['wrists']))[i]
        key = self.solve_key(record,i,rotation,clearance)
        self.stats['solveCalls'] += 1
        if key in self.solutions:
            self.stats['solveHits'] += 1
            result, context = self.solutions.pop(key);self.solutions[key] = (result,context)
            if self.stats['solveDuplicatesChecked'] < 8:
                fresh = self.original_solve(record,i,rotation,thumb_clearance)
                assert np.array_equal(fresh[1],result[1]), 'Exact solve cache geometry mismatch'
                assert all(fresh[2][f] == result[2][f] for f in range(1,6))
                for f in range(1,6):
                    assert fresh[0][f]['points'] == result[0][f]['points']
                    if 'rotations' in fresh[0][f]:assert fresh[0][f]['rotations'] == result[0][f]['rotations']
                self.stats['solveDuplicatesChecked'] += 1
            self.restore(record['geometry'],context)
            return deepcopy(result)
        result = self.original_solve(record,i,rotation,thumb_clearance)
        self.solutions[key] = (deepcopy(result),self.context(record['geometry']))
        while len(self.solutions)>self.limit:self.solutions.popitem(last=False)
        return result

    def cross(self, vertices, partitions):
        self.stats['crossingCalls'] += 1
        digest = hashlib.sha256(vertices.tobytes())
        digest.update(json.dumps([vertices.shape,vertices.dtype.str,sorted(partitions)]).encode())
        key = digest.digest()
        if key in self.crossings:
            self.stats['crossingHits'] += 1
            result = self.crossings.pop(key);self.crossings[key] = result
            if self.stats['crossingDuplicatesChecked'] < 8:
                assert self.original_crossings(vertices,partitions) == result, 'Exact crossing cache mismatch'
                self.stats['crossingDuplicatesChecked'] += 1
            return result.copy()
        result = self.original_crossings(vertices,partitions)
        self.crossings[key] = result.copy()
        while len(self.crossings)>self.limit:self.crossings.popitem(last=False)
        return result


def install(record):
    import excerpt_input_solver
    import excerpt_thumb_clearance
    import film_support_first
    import self_clearance
    cache = ExactSolverCache(record,excerpt_input_solver.solve_index,self_clearance.crossings)
    for module in (excerpt_input_solver,excerpt_thumb_clearance,film_support_first):
        module.solve_index = cache.solve
    for module in (self_clearance,excerpt_thumb_clearance,film_support_first):
        module.crossings = cache.cross
    return cache

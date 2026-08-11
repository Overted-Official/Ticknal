"""Reproducible research datasets built from canonical market snapshots."""

from .dataset_v1 import CandidateDataset, build_candidate_dataset
from .dataset_v2 import build_candidate_dataset_v2

__all__ = ["CandidateDataset", "build_candidate_dataset", "build_candidate_dataset_v2"]

"""IFC Element entity"""
from dataclasses import dataclass
from typing import Dict, Optional, List


@dataclass
class IfcElement:
    """IFC Element domain entity"""
    global_id: str
    type_name: str
    name: str
    properties: Dict[str, str]
    placement_matrix: Optional[List[float]] = None


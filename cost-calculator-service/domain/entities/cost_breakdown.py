"""Cost breakdown entities"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from decimal import Decimal


@dataclass
class CostItem:
    """Single cost item (material, labor, connection, etc.)"""
    category: str  # "material", "labor", "connection", "surface_treatment", etc.
    item_type: str  # "steel", "welding", "bolt_M12", etc.
    quantity: Decimal
    unit: str  # "kg", "m", "m²", "szt", "m³"
    unit_price: Decimal
    total_price: Decimal
    description: Optional[str] = None
    element_id: Optional[str] = None  # Reference to element this cost belongs to
    metadata: Dict[str, str] = field(default_factory=dict)  # Additional info


@dataclass
class ElementCostBreakdown:
    """Cost breakdown for a single element"""
    element_id: str
    element_type: str
    element_name: str
    cost_items: List[CostItem] = field(default_factory=list)
    subtotal: Decimal = Decimal('0.00')
    waste_factor: Decimal = Decimal('0.00')  # e.g., 0.05 for 5%
    waste_cost: Decimal = Decimal('0.00')
    total: Decimal = Decimal('0.00')
    
    def calculate_total(self):
        """Calculate total including waste"""
        self.subtotal = sum(item.total_price for item in self.cost_items)
        self.waste_cost = self.subtotal * self.waste_factor
        self.total = self.subtotal + self.waste_cost


@dataclass
class ProjectCostBreakdown:
    """Complete cost breakdown for entire project"""
    project_name: str
    element_costs: List[ElementCostBreakdown] = field(default_factory=list)
    
    # Summary by category
    category_totals: Dict[str, Decimal] = field(default_factory=dict)
    
    # Overall totals
    total_material_cost: Decimal = Decimal('0.00')
    total_labor_cost: Decimal = Decimal('0.00')
    total_connection_cost: Decimal = Decimal('0.00')
    total_surface_treatment_cost: Decimal = Decimal('0.00')
    total_other_cost: Decimal = Decimal('0.00')
    grand_total: Decimal = Decimal('0.00')
    
    def calculate_totals(self):
        """Calculate all totals"""
        self.category_totals = {}
        
        for element_cost in self.element_costs:
            element_cost.calculate_total()
            
            for item in element_cost.cost_items:
                category = item.category
                if category not in self.category_totals:
                    self.category_totals[category] = Decimal('0.00')
                self.category_totals[category] += item.total_price
        
        self.total_material_cost = self.category_totals.get('material', Decimal('0.00'))
        self.total_labor_cost = self.category_totals.get('labor', Decimal('0.00'))
        self.total_connection_cost = self.category_totals.get('connection', Decimal('0.00'))
        self.total_surface_treatment_cost = self.category_totals.get('surface_treatment', Decimal('0.00'))
        self.total_other_cost = sum(
            v for k, v in self.category_totals.items() 
            if k not in ['material', 'labor', 'connection', 'surface_treatment']
        )
        
        self.grand_total = (
            self.total_material_cost +
            self.total_labor_cost +
            self.total_connection_cost +
            self.total_surface_treatment_cost +
            self.total_other_cost
        )


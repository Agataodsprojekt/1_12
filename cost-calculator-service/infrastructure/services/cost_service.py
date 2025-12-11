"""Cost service implementation with extensible providers"""
from typing import Dict, Any, List, Optional
from decimal import Decimal

from domain.interfaces.cost_service import ICostService
from domain.interfaces.cost_provider import ICostProvider
from domain.interfaces.rule_loader import IRuleLoader
from domain.entities.cost_breakdown import (
    CostItem, ElementCostBreakdown, ProjectCostBreakdown
)
from ifc_common import Result
from infrastructure.config.settings import Settings

from infrastructure.services.material_cost_provider import MaterialCostProvider
from infrastructure.services.connection_cost_provider import ConnectionCostProvider


class CostService(ICostService):
    """Cost service with extensible provider architecture"""
    
    def __init__(self, settings: Settings, rule_loader: IRuleLoader = None):
        self.settings = settings
        self.rule_loader = rule_loader or self._create_default_rule_loader()
        
        # Register cost providers (Strategy pattern)
        self.providers: List[ICostProvider] = [
            MaterialCostProvider(),
            ConnectionCostProvider(),
            # Add more providers here as needed:
            # LaborCostProvider(),
            # SurfaceTreatmentCostProvider(),
        ]
    
    def _create_default_rule_loader(self) -> IRuleLoader:
        """Create default rule loader"""
        from infrastructure.config.rules_loader import JsonRuleLoader
        return JsonRuleLoader()
    
    async def calculate_costs(
        self,
        elements: List[Dict[str, Any]]
    ) -> Result[Dict[str, Any], str]:
        """Calculate costs for all elements using registered providers"""
        try:
            # Load business rules
            rules = self.rule_loader.load_rules()
            calculation_rules = rules.get('calculation_rules', {})
            enabled_providers = calculation_rules.get('enabled_providers', ['material', 'connection'])
            
            # Filter providers based on rules
            active_providers = [
                p for p in self.providers 
                if p.get_provider_name() in enabled_providers
            ]
            
            # Create project cost breakdown
            project_cost = ProjectCostBreakdown(
                project_name="IFC Project"
            )
            
            # Calculate costs for each element
            for element in elements:
                element_breakdown = self._calculate_element_costs(
                    element, 
                    active_providers, 
                    rules
                )
                
                if element_breakdown:
                    project_cost.element_costs.append(element_breakdown)
            
            # Calculate totals
            project_cost.calculate_totals()
            
            # Convert to dict for JSON serialization
            return Result.success(self._cost_breakdown_to_dict(project_cost))
            
        except Exception as e:
            return Result.failure(f"Cost calculation error: {str(e)}")
    
    def _calculate_element_costs(
        self,
        element: Dict[str, Any],
        providers: List[ICostProvider],
        rules: Dict[str, Any]
    ) -> ElementCostBreakdown:
        """Calculate costs for a single element using all applicable providers"""
        element_id = element.get('global_id', 'unknown')
        element_type = element.get('type_name', 'Unknown')
        element_name = element.get('name', element_id)
        
        element_breakdown = ElementCostBreakdown(
            element_id=element_id,
            element_type=element_type,
            element_name=element_name
        )
        
        # Get waste factor
        waste_factors = rules.get('waste_factors', {})
        material = element.get('properties', {}).get('MATERIAL', 'default')
        element_breakdown.waste_factor = waste_factors.get(material, waste_factors.get('default', Decimal('0.05')))
        
        # Collect cost items from all applicable providers
        for provider in providers:
            if provider.can_calculate(element):
                try:
                    cost_items = provider.calculate(element, rules)
                    element_breakdown.cost_items.extend(cost_items)
                except Exception as e:
                    # Log error but continue with other providers
                    print(f"Error calculating {provider.get_provider_name()} cost for {element_id}: {e}")
        
        # Calculate totals for this element
        element_breakdown.calculate_total()
        
        return element_breakdown
    
    def _cost_breakdown_to_dict(self, breakdown: ProjectCostBreakdown) -> Dict[str, Any]:
        """Convert cost breakdown to dictionary for JSON serialization"""
        return {
            'project_name': breakdown.project_name,
            'summary': {
                'total_material_cost': float(breakdown.total_material_cost),
                'total_labor_cost': float(breakdown.total_labor_cost),
                'total_connection_cost': float(breakdown.total_connection_cost),
                'total_surface_treatment_cost': float(breakdown.total_surface_treatment_cost),
                'total_other_cost': float(breakdown.total_other_cost),
                'grand_total': float(breakdown.grand_total),
                'category_totals': {
                    k: float(v) for k, v in breakdown.category_totals.items()
                }
            },
            'element_costs': [
                {
                    'element_id': ec.element_id,
                    'element_type': ec.element_type,
                    'element_name': ec.element_name,
                    'cost_items': [
                        {
                            'category': item.category,
                            'item_type': item.item_type,
                            'quantity': float(item.quantity),
                            'unit': item.unit,
                            'unit_price': float(item.unit_price),
                            'total_price': float(item.total_price),
                            'description': item.description,
                            'metadata': item.metadata
                        }
                        for item in ec.cost_items
                    ],
                    'subtotal': float(ec.subtotal),
                    'waste_factor': float(ec.waste_factor),
                    'waste_cost': float(ec.waste_cost),
                    'total': float(ec.total)
                }
                for ec in breakdown.element_costs
            ]
        }

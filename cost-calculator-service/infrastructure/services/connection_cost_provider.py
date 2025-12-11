"""Connection cost provider - for welds, bolts, joints, etc."""
from typing import Dict, Any, List
from decimal import Decimal

from domain.interfaces.cost_provider import IConnectionCostProvider
from domain.entities.cost_breakdown import CostItem


class ConnectionCostProvider(IConnectionCostProvider):
    """Calculates costs for connections, welds, bolts, joints"""
    
    def get_provider_name(self) -> str:
        return "connection"
    
    def can_calculate(self, element: Dict[str, Any]) -> bool:
        """Can calculate if element has connection info"""
        properties = element.get('properties', {})
        type_name = element.get('type_name', '')
        
        # Check if element has connection-related properties
        connection_keys = [
            'CONNECTION_CODE',
            'Welding',
            'Bolts',
            'WeldLength',
            'BoltCount',
            'JointType'
        ]
        
        return any(key in properties for key in connection_keys) or \
               'IfcFastener' in type_name or \
               'IfcMechanicalFastener' in type_name
    
    def calculate(self, element: Dict[str, Any], rules: Dict[str, Any]) -> List[CostItem]:
        """Calculate connection costs"""
        properties = element.get('properties', {})
        connection_costs = rules.get('connection_costs', {})
        labor_rates = rules.get('labor_rates', {})
        
        cost_items = []
        
        # 1. Welding costs
        welding_cost = self._calculate_welding_cost(element, properties, labor_rates, connection_costs)
        if welding_cost:
            cost_items.extend(welding_cost)
        
        # 2. Bolt costs
        bolt_cost = self._calculate_bolt_cost(element, properties, connection_costs)
        if bolt_cost:
            cost_items.extend(bolt_cost)
        
        # 3. Connection type specific costs
        connection_type_cost = self._calculate_connection_type_cost(element, properties, connection_costs)
        if connection_type_cost:
            cost_items.extend(connection_type_cost)
        
        return cost_items
    
    def _calculate_welding_cost(
        self, 
        element: Dict[str, Any],
        properties: Dict[str, str],
        labor_rates: Dict[str, Any],
        connection_costs: Dict[str, Any]
    ) -> List[CostItem]:
        """Calculate welding costs"""
        cost_items = []
        
        # Try to get weld length
        weld_length = self._try_get_property(properties, [
            'WeldLength',
            'WeldingLength',
            'BaseQuantities.Length'  # Might be weld length for fasteners
        ])
        
        if weld_length > 0:
            # Get welding rate
            welding_rate = connection_costs.get('welding', {})
            price_per_meter = Decimal(str(welding_rate.get('price_per_meter', 0)))
            
            if price_per_meter > 0:
                # Convert mm to m if needed
                if weld_length > 100:  # Likely in mm
                    weld_length_m = weld_length / 1000
                else:
                    weld_length_m = weld_length
                
                total_price = Decimal(str(weld_length_m)) * price_per_meter
                
                cost_items.append(CostItem(
                    category='connection',
                    item_type='welding',
                    quantity=Decimal(str(weld_length_m)),
                    unit='m',
                    unit_price=price_per_meter,
                    total_price=total_price,
                    description="Welding cost",
                    element_id=element.get('global_id'),
                    metadata={'weld_length_mm': str(weld_length)}
                ))
        
        # Alternative: count welding operations if length not available
        connection_code = properties.get('CONNECTION_CODE', '')
        if connection_code and 'welding' in connection_code.lower():
            welding_rate = connection_costs.get('welding', {})
            price_per_operation = Decimal(str(welding_rate.get('price_per_operation', 0)))
            
            if price_per_operation > 0:
                cost_items.append(CostItem(
                    category='connection',
                    item_type='welding_operation',
                    quantity=Decimal('1'),
                    unit='szt',
                    unit_price=price_per_operation,
                    total_price=price_per_operation,
                    description=f"Welding operation: {connection_code}",
                    element_id=element.get('global_id')
                ))
        
        return cost_items
    
    def _calculate_bolt_cost(
        self,
        element: Dict[str, Any],
        properties: Dict[str, str],
        connection_costs: Dict[str, Any]
    ) -> List[CostItem]:
        """Calculate bolt/fastener costs"""
        cost_items = []
        
        # Try to get bolt count
        bolt_count = self._try_get_property(properties, [
            'BoltCount',
            'Bolts',
            'FastenerCount'
        ])
        
        if bolt_count > 0:
            # Get bolt type/size from properties
            bolt_type = properties.get('BoltType', 'M12')  # Default M12
            bolt_size = properties.get('BoltSize', 'M12')
            
            bolt_config = connection_costs.get('bolts', {}).get(bolt_size, {})
            if not bolt_config:
                # Try default
                bolt_config = connection_costs.get('bolts', {}).get('default', {})
            
            price_per_bolt = Decimal(str(bolt_config.get('price_per_unit', 0)))
            
            if price_per_bolt > 0:
                total_price = Decimal(str(bolt_count)) * price_per_bolt
                
                cost_items.append(CostItem(
                    category='connection',
                    item_type=f'bolt_{bolt_size}',
                    quantity=Decimal(str(bolt_count)),
                    unit='szt',
                    unit_price=price_per_bolt,
                    total_price=total_price,
                    description=f"{bolt_count} x {bolt_size} bolts",
                    element_id=element.get('global_id')
                ))
        
        return cost_items
    
    def _calculate_connection_type_cost(
        self,
        element: Dict[str, Any],
        properties: Dict[str, str],
        connection_costs: Dict[str, Any]
    ) -> List[CostItem]:
        """Calculate costs based on connection type"""
        cost_items = []
        
        connection_code = properties.get('CONNECTION_CODE', '')
        connection_type = properties.get('JointType', '')
        
        # Look for connection type in rules
        if connection_type:
            type_cost = connection_costs.get('connection_types', {}).get(connection_type)
            if type_cost:
                price = Decimal(str(type_cost.get('price', 0)))
                if price > 0:
                    cost_items.append(CostItem(
                        category='connection',
                        item_type=f'connection_{connection_type}',
                        quantity=Decimal('1'),
                        unit='szt',
                        unit_price=price,
                        total_price=price,
                        description=f"Connection: {connection_type}",
                        element_id=element.get('global_id')
                    ))
        
        return cost_items
    
    def _try_get_property(self, properties: Dict[str, str], keys: List[str]) -> float:
        """Try to get numeric property value"""
        for key in keys:
            value = properties.get(key)
            if value:
                try:
                    return float(value)
                except (ValueError, TypeError):
                    continue
        return 0.0


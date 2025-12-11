"""Rule loader - loads business rules from JSON files"""
import json
import os
from typing import Dict, Any
from decimal import Decimal
from pathlib import Path

from domain.interfaces.rule_loader import IRuleLoader


class JsonRuleLoader(IRuleLoader):
    """Loads rules from JSON files"""
    
    def __init__(self, rules_dir: str = None):
        self.rules_dir = rules_dir or os.path.join(
            os.path.dirname(__file__),
            '..', '..', '..', 'rules'
        )
        self._rules_cache = None
    
    def load_rules(self) -> Dict[str, Any]:
        """Load all rules from JSON files"""
        if self._rules_cache is not None:
            return self._rules_cache
        
        rules = {
            'material_prices': self.get_material_prices(),
            'labor_rates': self.get_labor_rates(),
            'connection_costs': self.get_connection_costs(),
            'waste_factors': self.get_waste_factors(),
            'calculation_rules': self.get_calculation_rules()
        }
        
        self._rules_cache = rules
        return rules
    
    def get_material_prices(self) -> Dict[str, Dict[str, Any]]:
        """Load material prices from JSON"""
        file_path = os.path.join(self.rules_dir, 'material_prices.json')
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        # Return default prices if file doesn't exist
        return self._get_default_material_prices()
    
    def get_labor_rates(self) -> Dict[str, Dict[str, Any]]:
        """Load labor rates from JSON"""
        file_path = os.path.join(self.rules_dir, 'labor_rates.json')
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return self._get_default_labor_rates()
    
    def get_connection_costs(self) -> Dict[str, Dict[str, Any]]:
        """Load connection costs from JSON"""
        file_path = os.path.join(self.rules_dir, 'connection_costs.json')
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return self._get_default_connection_costs()
    
    def get_waste_factors(self) -> Dict[str, Decimal]:
        """Load waste factors from JSON"""
        file_path = os.path.join(self.rules_dir, 'waste_factors.json')
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {k: Decimal(str(v)) for k, v in data.items()}
        
        return self._get_default_waste_factors()
    
    def get_calculation_rules(self) -> Dict[str, Any]:
        """Load calculation rules from JSON"""
        file_path = os.path.join(self.rules_dir, 'calculation_rules.json')
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return {'enabled_providers': ['material', 'connection']}
    
    def _get_default_material_prices(self) -> Dict[str, Dict[str, Any]]:
        """Default material prices"""
        return {
            "STEEL/S355": {
                "unit": "kg",
                "price_per_unit": 4.50,
                "density_kg_m3": 7850
            },
            "STEEL/S235": {
                "unit": "kg",
                "price_per_unit": 4.20,
                "density_kg_m3": 7850
            },
            "CONCRETE/C30": {
                "unit": "m³",
                "price_per_unit": 450.00,
                "density_kg_m3": 2400
            }
        }
    
    def _get_default_labor_rates(self) -> Dict[str, Dict[str, Any]]:
        """Default labor rates"""
        return {
            "welding": {
                "rate_per_hour": 80.00,
                "rate_per_meter": 25.00
            },
            "cutting": {
                "rate_per_hour": 60.00
            }
        }
    
    def _get_default_connection_costs(self) -> Dict[str, Dict[str, Any]]:
        """Default connection costs"""
        return {
            "welding": {
                "price_per_meter": 25.00,
                "price_per_operation": 50.00
            },
            "bolts": {
                "M12": {
                    "price_per_unit": 2.50
                },
                "M16": {
                    "price_per_unit": 3.50
                },
                "M20": {
                    "price_per_unit": 5.00
                },
                "default": {
                    "price_per_unit": 2.50
                }
            },
            "connection_types": {
                "rigid_frame": {
                    "price": 150.00
                },
                "hinged": {
                    "price": 80.00
                }
            }
        }
    
    def _get_default_waste_factors(self) -> Dict[str, Decimal]:
        """Default waste factors"""
        return {
            "STEEL/S355": Decimal('0.05'),  # 5%
            "STEEL/S235": Decimal('0.05'),
            "CONCRETE/C30": Decimal('0.10'),  # 10%
            "default": Decimal('0.05')
        }


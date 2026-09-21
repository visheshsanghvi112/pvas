import os
import json
from datetime import datetime
from typing import Dict, Any

class MarketCalendarService:
    """
    Authoritative Market Calendar Contract.
    
    This service decouples market session status from data presence. 
    It prevents the system from inferring that "missing data" means "holiday".
    Instead, it explicitly defines OPEN/CLOSED sessions using an authoritative calendar.
    """
    
    def __init__(self):
        self.calendar_data = {}
        self._load_calendar()
        
    def _load_calendar(self):
        file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'market_calendar.json')
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    self.calendar_data = json.load(f)
            except Exception as e:
                print(f"[MarketCalendarService] Failed to load calendar: {e}")
                
    def get_market_status(self, dt: str, market: str = "NSE", segment: str = "EQ") -> Dict[str, Any]:
        """
        Returns the authoritative market status for a given date.
        
        Args:
            dt: Date string in YYYY-MM-DD format
            market: Exchange market (e.g., "NSE", "BSE")
            segment: Market segment (e.g., "EQ", "FO")
            
        Returns:
            Dict containing status ("OPEN" or "CLOSED") and reason.
        """
        try:
            d = datetime.strptime(dt, "%Y-%m-%d").date()
        except ValueError:
            return {"date": dt, "market": market, "status": "UNKNOWN", "reason": "Invalid date format"}
            
        year_str = str(d.year)
        
        # 1. Check if it's a weekend
        if d.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
            # Edge case: Special weekend trading sessions (e.g. Muhurat Trading)
            if year_str in self.calendar_data:
                for special in self.calendar_data[year_str].get("special_sessions", []):
                    if special["date"] == dt:
                        return {"date": dt, "market": market, "status": "OPEN", "reason": special["description"]}
            return {"date": dt, "market": market, "status": "CLOSED", "reason": "Weekend"}
            
        # 2. Check if it's an official exchange holiday
        if year_str in self.calendar_data:
            for holiday in self.calendar_data[year_str].get("holidays", []):
                if holiday["date"] == dt:
                    return {"date": dt, "market": market, "status": "CLOSED", "reason": holiday["description"]}
                    
        # 3. If neither weekend nor holiday, it's an OPEN session
        return {"date": dt, "market": market, "status": "OPEN", "reason": "Normal Trading Day"}

    def is_market_open(self, dt: str, market: str = "NSE", segment: str = "EQ") -> bool:
        """Helper to quickly check if market is open."""
        return self.get_market_status(dt, market, segment).get("status") == "OPEN"

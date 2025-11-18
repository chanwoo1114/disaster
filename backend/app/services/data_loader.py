import glob
import os
import pandas as pd

class DataCache:
    def __init__(self):
        self.cache: Dict[str, Dict[str, pd.DataFrame]] = {}

    def load_simulation_file(self):
        self.cache[directory] = {}

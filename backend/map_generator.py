import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

import geopandas as gpd
import matplotlib.pyplot as plt
from matplotlib.patches import PathPatch
import matplotlib.patheffects as PathEffects
import numpy as np
import requests
import os
from io import BytesIO
from zipfile import ZipFile
from shapely.affinity import scale, translate

class RegionalMapGenerator:
    def __init__(self):
        # URLs for shapefiles
        self.admin_url = "https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_1_states_provinces.zip"
        self.water_url = "https://naciscdn.org/naturalearth/50m/physical/ne_50m_lakes.zip"
        
        # Load state/province boundaries and lakes
        self.states_provinces = self._load_shapefile(self.admin_url, 'admin')
        self.lakes = self._load_shapefile(self.water_url, 'lakes')
        
        # Initialize region data storage
        self.regions = {}
        
        # Create state/province abbreviation mapping
        self.abbreviations = {
            # US States
            'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
            'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
            'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
            'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
            'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
            'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
            'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
            'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
            'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
            'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR',
            'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
            'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
            'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
            'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
            # Canadian Provinces
            'British Columbia': 'BC', 'Alberta': 'AB', 'Saskatchewan': 'SK',
            'Manitoba': 'MB', 'Ontario': 'ON', 'Québec': 'QC',
            'Newfoundland and Labrador': 'NL'
        }

    def _load_shapefile(self, url, type_name):
        """Download and load shapefiles."""
        if not os.path.exists('data'):
            os.makedirs('data')
            
        filename = 'ne_50m_admin_1_states_provinces.shp' if type_name == 'admin' else 'ne_50m_lakes.shp'
        shapefile_path = f'data/{filename}'
        
        # Download the shapefile if it doesn't exist
        if not os.path.exists(shapefile_path):
            try:
                print(f"Downloading {type_name} shapefile data...")
                headers = {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': '*/*'
                }
                response = requests.get(url, headers=headers, timeout=30, verify=True)
                response.raise_for_status()
                
                zip_path = f'data/temp_{type_name}.zip'
                with open(zip_path, 'wb') as f:
                    f.write(response.content)
                
                with ZipFile(zip_path) as zip_file:
                    zip_file.extractall('data')
                
                os.remove(zip_path)
                
            except Exception as e:
                print(f"Error downloading {type_name} data: {str(e)}")
                raise
        
        # Read and process the shapefile
        data = gpd.read_file(shapefile_path)
        
        # Filter based on type
        if type_name == 'admin':
            # Define provinces to exclude
            excluded_provinces = [
                'Nunavut', 'Northwest Territories', 'Yukon',
                'New Brunswick', 'Prince Edward Island', 'Nova Scotia'
            ]
            
            # Create the filter
            us_mask = data['admin'] == 'United States of America'
            canada_mask = data['admin'] == 'Canada'
            not_excluded_mask = ~data['name'].isin(excluded_provinces)
            
            # Apply the filter
            data = data[
                (us_mask | canada_mask) & not_excluded_mask
            ].copy()
            
            print(f"\nFiltered to {len(data)} states/provinces")
            print("States/provinces included:", sorted(data['name'].unique()))
            
        elif type_name == 'lakes':
            # Filter to only include the Great Lakes
            great_lakes = ['Lake Superior', 'Lake Michigan', 'Lake Huron', 'Lake Erie', 'Lake Ontario']
            data = data[data['name'].isin(great_lakes)].copy()
        
        # Ensure proper projection
        if data.crs is None:
            data.set_crs(epsg=4326, inplace=True)
        data = data.to_crs(epsg=3857)
        
        return data

    def add_region(self, name: str, territories: list, color: str, sales_rep: str, sales_number: int):
        """Add a new region with its territories and properties."""
        self.regions[name] = {
            'territories': territories,
            'color': color,
            'sales_rep': sales_rep,
            'sales_number': sales_number
        }

    def _add_abbreviations(self, ax, states):
        """Add state/province abbreviations centered in each territory."""
        # Calculate area range for scaling
        areas = states.geometry.area
        min_area = areas.min()
        max_area = areas.max()
        
        for _, row in states.iterrows():
            if row['name'] in self.abbreviations:
                # Calculate size based on state area
                area = row.geometry.area
                size_factor = (area - min_area) / (max_area - min_area)
                font_size = 6 + (size_factor * 6)  # Scale between 6 and 12
                
                # Get the centroid for center placement
                centroid = row.geometry.centroid
                
                # Add the abbreviation text with a black outline
                txt = ax.text(
                    centroid.x, centroid.y,
                    self.abbreviations[row['name']],
                    color='white',
                    ha='center',
                    va='center',
                    fontsize=font_size,
                    fontweight='bold',
                    zorder=5
                )
                txt.set_path_effects([PathEffects.withStroke(linewidth=1.5, foreground='black')])

    def _create_inset_map(self, ax, state_name, transform):
        """Create an inset map for Alaska or Hawaii."""
        state_data = self.states_provinces[self.states_provinces['name'] == state_name]
        if not state_data.empty:
            # Find the color for this state if it's in a region
            state_color = '#2C2C2C'
            for region in self.regions.values():
                if state_name in region['territories']:
                    state_color = region['color']
                    break
            
            # Get the geometry and its centroid
            geom = state_data.geometry.iloc[0]
            centroid = geom.centroid
            
            # Create scaled and translated geometry
            scaled_geom = scale(geom, xfact=transform['scale'], yfact=transform['scale'], origin='center')
            transformed_geom = translate(scaled_geom, 
                                      xoff=transform['x'] - centroid.x,
                                      yoff=transform['y'] - centroid.y)
            
            # Create a GeoDataFrame with the transformed geometry
            inset_gdf = gpd.GeoDataFrame(
                {'geometry': [transformed_geom]},
                crs=state_data.crs
            )
            
            # Plot the state
            inset_gdf.plot(
                ax=ax,
                color=state_color,
                edgecolor='white',
                linewidth=0.8
            )
            
            # Add state abbreviation
            inset_centroid = transformed_geom.centroid
            txt = ax.text(
                inset_centroid.x, inset_centroid.y,
                self.abbreviations[state_name],
                color='white',
                ha='center',
                va='center',
                fontsize=8,
                fontweight='bold',
                zorder=5
            )
            txt.set_path_effects([PathEffects.withStroke(linewidth=1.5, foreground='black')])

    def generate_map(self, figsize=(15, 10), output_path=None, dpi=300):
        """Generate the regional map."""
        # Setup the figure
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=figsize, facecolor='#1C1C1C')
        ax.set_facecolor('#1C1C1C')
        
        # Get continental states/provinces (excluding Alaska and Hawaii)
        continental = self.states_provinces[
            ~self.states_provinces['name'].isin(['Alaska', 'Hawaii'])
        ].copy()
        
        # Set map bounds
        bounds = continental.total_bounds
        ax.set_xlim([bounds[0] - 1000000, bounds[2] + 1000000])
        ax.set_ylim([bounds[1] - 1000000, bounds[3] + 1000000])
        
        # Plot each state/province
        for name, geometry in zip(continental['name'], continental['geometry']):
            try:
                # Determine the state's color
                state_color = '#2C2C2C'  # Default color
                for region_data in self.regions.values():
                    if name in region_data['territories']:
                        state_color = region_data['color']
                        break
                
                # Plot the state
                gpd.GeoSeries([geometry], crs=continental.crs).plot(
                    ax=ax,
                    color=state_color,
                    edgecolor='white' if state_color != '#2C2C2C' else '#404040',
                    linewidth=0.8 if state_color != '#2C2C2C' else 0.5
                )
            except Exception as e:
                print(f"Error plotting state {name}: {e}")
        
        # Plot the Great Lakes
        if len(self.lakes) > 0:
            self.lakes.plot(
                ax=ax,
                color='#1E4C7C',
                edgecolor='white',
                linewidth=0.5,
                alpha=1,
                zorder=1
            )
        
        # Add state/province abbreviations
        self._add_abbreviations(ax, continental)
        
        # Create insets for Alaska and Hawaii
        # Get California's bounds to help position the insets
        california = self.states_provinces[self.states_provinces['name'] == 'California']
        if not california.empty:
            ca_bounds = california.geometry.iloc[0].bounds
            
            # Position Alaska left of and below California
            alaska_x = ca_bounds[0] - 3000000  # Left of California
            alaska_y = ca_bounds[1] - 2000000  # Below California
            self._create_inset_map(ax, 'Alaska', 
                                {'scale': 0.3, 'x': alaska_x, 'y': alaska_y})
            
            # Position Hawaii right of Alaska
            hawaii_x = alaska_x + 2500000  # Right of Alaska
            hawaii_y = alaska_y  # Same vertical position as Alaska
            self._create_inset_map(ax, 'Hawaii',
                                {'scale': 0.8, 'x': hawaii_x, 'y': hawaii_y})
        
        # Add region labels with leader lines
        for region_name, region_data in self.regions.items():
            region_states = continental[continental['name'].isin(
                [t for t in region_data['territories'] if t not in ['Alaska', 'Hawaii']]
            )]
            
            if len(region_states) > 0:
                # Calculate label position
                centroid = region_states.geometry.unary_union.centroid
                bounds = region_states.geometry.unary_union.bounds
                
                # Determine label placement
                map_center_x = (continental.total_bounds[0] + continental.total_bounds[2]) / 2
                map_center_y = (continental.total_bounds[1] + continental.total_bounds[3]) / 2
                
                dx = 400000
                dy = 400000
                
                if centroid.x < map_center_x:
                    label_x = bounds[0] - dx/2
                    ha = 'right'
                else:
                    label_x = bounds[2] + dx/2
                    ha = 'left'
                
                if centroid.y < map_center_y:
                    label_y = bounds[1] - dy/2
                    va = 'top'
                else:
                    label_y = bounds[3] + dy/2
                    va = 'bottom'
                
                # Draw leader line
                ax.plot([centroid.x, label_x], [centroid.y, label_y],
                       color='white', linewidth=1.5, zorder=2,
                       path_effects=[PathEffects.withStroke(linewidth=3, foreground='black')])
                
                # Add label
                label_text = f"{region_data['sales_rep']}\nSALES {region_data['sales_number']}"
                txt = ax.text(
                    label_x, label_y,
                    label_text,
                    color='white',
                    ha=ha,
                    va=va,
                    fontsize=10,
                    fontweight='bold',
                    zorder=3
                )
                txt.set_path_effects([PathEffects.withStroke(linewidth=2, foreground='black')])
        
        # Customize map appearance
        ax.axis('off')
        ax.set_aspect('equal')
        
        # Add title
        plt.suptitle('INSIDE SALES REGIONS',
                    y=0.95,
                    color='white',
                    fontsize=20,
                    fontweight='bold')
        plt.title('U.S. & CANADA',
                 color='white',
                 fontsize=14,
                 pad=20)
        
        # Save the map
        if output_path:
            plt.savefig(output_path,
                       dpi=dpi,
                       bbox_inches='tight',
                       facecolor='#1C1C1C',
                       edgecolor='none')
            print(f"Map saved to {output_path}")
        
        return fig, ax
    
    def export_regions(self, filepath):
        """Export region data to a JSON file."""
        import json
        
        try:
            with open(filepath, 'w') as f:
                json.dump(self.regions, f, indent=2)
            print(f"Regions exported successfully to {filepath}")
            return True
        except Exception as e:
            print(f"Error exporting regions: {str(e)}")
            return False

    def import_regions(self, filepath):
        """Import region data from a JSON file."""
        import json
        
        try:
            with open(filepath, 'r') as f:
                regions = json.load(f)
                
            # Validate the imported data
            for name, data in regions.items():
                required_fields = ['territories', 'color', 'sales_rep', 'sales_number']
                if not all(field in data for field in required_fields):
                    raise ValueError(f"Region {name} is missing required fields")
                if not isinstance(data['territories'], list):
                    raise ValueError(f"Region {name} territories must be a list")
                if not isinstance(data['sales_number'], int):
                    raise ValueError(f"Region {name} sales number must be an integer")
            
            self.regions = regions
            print(f"Regions imported successfully from {filepath}")
            return True
        except Exception as e:
            print(f"Error importing regions: {str(e)}")
            return False
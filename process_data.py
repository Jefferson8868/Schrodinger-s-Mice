import pandas as pd
import json
import gzip

def process_data():
    # Load all sheets
    file_path = 'Mouse_Data_Student_Copy.xlsx'
    fem_act = pd.read_excel(file_path, sheet_name='Fem Act')
    male_act = pd.read_excel(file_path, sheet_name='Male Act')
    fem_temp = pd.read_excel(file_path, sheet_name='Fem Temp')
    male_temp = pd.read_excel(file_path, sheet_name='Male Temp')

    processed = []
    
    def process_sheet(df, gender, metric):
        df = df.reset_index().rename(columns={'index': 'Time'})
        df = df.melt(id_vars=['Time'], var_name='mouseId', value_name=metric)
        df['gender'] = gender
        df['time'] = pd.to_datetime('2023-01-01') + pd.to_timedelta(df['Time'], unit='m')
        df['minute'] = df['Time'] % 1440

        if gender == 'female' and metric == 'temp':
            day = (df['Time'] // 1440).astype(int)
            df['estrus'] = (day - 2) % 4 == 0

        return df

    # Process each gender separately
    for gender in ['male', 'female']:
        # Process activity data
        act_df = process_sheet(
            male_act if gender == 'male' else fem_act,
            gender,
            'activity'
        )
        # Process temperature data
        temp_df = process_sheet(
            male_temp if gender == 'male' else fem_temp,
            gender,
            'temp'
        )
        print(temp_df.head())
        # Merge activity and temperature data
        if gender == 'female':
            merged_df = pd.merge(
                act_df,
                temp_df[['Time', 'mouseId', 'temp']],
                on=['Time', 'mouseId'],
                how='outer'
            )
        else:
            merged_df = pd.merge(
                act_df,
                temp_df[['Time', 'mouseId', 'temp']],
                on=['Time', 'mouseId'],
                how='outer'
            )
        
        processed.append(merged_df)

    final_df = pd.concat(processed)
    
    # Convert timestamp to string before saving
    final_df['time'] = final_df['time'].dt.strftime('%Y-%m-%dT%H:%M:%S')
    print(final_df.head())
    # Save as a compressed JSON file
    with gzip.open("processed_data.json.gz", "wt", encoding="utf-8") as f:
        json.dump(final_df.to_dict(orient="records"), f)

if __name__ == '__main__':
    process_data()

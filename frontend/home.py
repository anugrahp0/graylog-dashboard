import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import json
import pytz

# Function to fetch logs from Django API
def fetch_logs():
    graylog_api_url = 'http://localhost:8000/api/graylog-logs/'  # Replace with your Django API URL
    response = requests.get(graylog_api_url)
    
    if response.status_code == 200:
        return response.json()
    else:
        st.error("Failed to fetch logs")
        return []

# Convert logs to DataFrame
def logs_to_dataframe(logs):
    parsed_logs = []
    for log in logs:
        # Parse the JSON string inside the 'message' field
        log_data = json.loads(log['message'].replace("'", "\""))
        parsed_logs.append(log_data)
    
    df = pd.DataFrame(parsed_logs)
    if not df.empty:
        df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)  # Assume timestamps are in UTC
        df.sort_values(by='timestamp', inplace=True)
    return df

# Function to convert timestamps to a specific timezone
def convert_timezone(df, timezone):
    # Convert to the desired timezone
    df['timestamp'] = df['timestamp'].dt.tz_convert(timezone)
    print(timezone)
    return df

# Function to filter DataFrame by a 5-minute window
def filter_by_time_window(df, selected_time):
    # Define the time window
    time_window_start = selected_time - pd.Timedelta(minutes=6)
    time_window_end = selected_time + pd.Timedelta(minutes=6)
    
    # Filter the DataFrame
    filtered_df = df[(df['timestamp'] >= time_window_start) & (df['timestamp'] <= time_window_end)]
    return filtered_df

# Streamlit app
def main():
    st.title('Graylog Logs Scatter Plot')

    # Dropdown menu for selecting timezone
    timezone = st.selectbox(
        'Select Timezone',
        pytz.all_timezones,  # List of all timezones
        index=pytz.all_timezones.index('UTC')  # Default to UTC
    )

    logs = fetch_logs()
    df = logs_to_dataframe(logs)

    if not df.empty:
        # Convert timestamps to selected timezone
        df = convert_timezone(df, timezone)

        # Time picker to select the time
        selected_time = st.time_input('Select Time', df['timestamp'].dt.time.iloc[0])
        selected_datetime = pd.Timestamp.combine(df['timestamp'].dt.date.iloc[0], selected_time)
        selected_datetime = pytz.timezone(timezone).localize(selected_datetime)

        # Filter the logs by the 5-minute window around the selected time
        filtered_df = filter_by_time_window(df, selected_datetime)

        if not filtered_df.empty:
          

            st.write("### Scatter Plot")
            fig = px.scatter(filtered_df, x='timestamp', y='message', title=f'Logs Scatter Plot - {timezone} Time')

            # Show the message when clicking on a dot
            fig.update_traces(
                textposition='top center',
                marker=dict(size=10),
                hovertemplate=filtered_df['message']
            )

            st.plotly_chart(fig)
        else:
            st.write("No logs available in the selected time window")
    else:
        st.write("No logs available")

if __name__ == "__main__":
    main()

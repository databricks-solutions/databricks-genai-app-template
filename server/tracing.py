"""MLFlow tracing utils."""

import os
from pathlib import Path
from typing import Optional

import mlflow
from dotenv import load_dotenv
from mlflow import tracing

# Load .env.local if it exists, otherwise fall back to environment variables
env_file = Path('.env.local')
if env_file.exists():
  load_dotenv(dotenv_path='.env.local')
elif Path('.env').exists():
  load_dotenv(dotenv_path='.env')

# Set the mlflow tracking URI to databricks.
# NOTE: You can also use the environment variable MLFLOW_TRACKING_URI to set the tracking URI.
mlflow.set_tracking_uri('databricks')

MLFLOW_EXPERIMENT_ID = os.environ.get('MLFLOW_EXPERIMENT_ID', None)
IS_DESTINATION_ONLINE = False

# Try to set the experiment, but don't fail if it doesn't exist
if MLFLOW_EXPERIMENT_ID:
  try:
    mlflow.set_experiment(experiment_id=MLFLOW_EXPERIMENT_ID)
    tracing.set_destination(tracing.destination.Databricks(experiment_id=MLFLOW_EXPERIMENT_ID))
    IS_DESTINATION_ONLINE = True
    print(f'✅ MLflow tracing enabled for experiment ID: {MLFLOW_EXPERIMENT_ID}')
  except Exception as e:
    print(f'⚠️  MLflow experiment {MLFLOW_EXPERIMENT_ID} not found: {e}')
    print('⚠️  Creating a new experiment for tracing...')
    try:
      experiment_name = f'/assistant-app-demo-{os.getpid()}'
      experiment = mlflow.set_experiment(experiment_name=experiment_name)
      MLFLOW_EXPERIMENT_ID = experiment.experiment_id
      tracing.set_destination(tracing.destination.Databricks(experiment_id=MLFLOW_EXPERIMENT_ID))
      IS_DESTINATION_ONLINE = True
      print(f'✅ Created new MLflow experiment: {experiment_name} (ID: {MLFLOW_EXPERIMENT_ID})')
    except Exception as create_error:
      print(f'⚠️  Could not create MLflow experiment: {create_error}')
      print('⚠️  Running without MLflow tracing')
      MLFLOW_EXPERIMENT_ID = None
else:
  print('⚠️  MLFLOW_EXPERIMENT_ID not set, running without MLflow tracing')


def setup_mlflow_tracing():
  """Sets up MLflow tracing.

  Note: LangChain autologging is not used in this application.
  Tracing is handled via @mlflow.trace decorators on individual functions.
  """
  # MLflow tracking is already configured at module level
  if MLFLOW_EXPERIMENT_ID and IS_DESTINATION_ONLINE:
    print('✅ MLflow tracing enabled')
  else:
    print('⚠️  MLflow tracing disabled - running without monitoring')


def get_mlflow_experiment_id() -> Optional[str]:
  """Gets the current mlflow experiment id."""
  return MLFLOW_EXPERIMENT_ID

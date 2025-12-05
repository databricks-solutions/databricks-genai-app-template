"""Minimal MLflow configuration for feedback logging."""

import mlflow

# Set the MLflow tracking URI to Databricks
# This is needed for mlflow.log_feedback() to work properly
mlflow.set_tracking_uri('databricks')

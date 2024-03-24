.PHONY: run-test run-prod

SHELL := /bin/bash

run: venv/bin/activate
	. venv/bin/activate && python server.py

venv/bin/activate:
	python3 -m venv venv
	. venv/bin/activate && pip install -r requirements.txt


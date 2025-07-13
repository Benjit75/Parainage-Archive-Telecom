# Parainage Archive Telecom

The goal of this project is to create a webpage to dynamically visualize and browse through the history of "parainage" at Télécom, that is friendly tutoring groups for first-year students organized by second year and older students.

This project implements a graph display, powered by a Node.js server that can handle visitor contributions (to add more elements on the database collaboratively).

## Installation
* Clone the repository:
```bash
git clone https://github.com/Benjit75/Parainage-Archive-Telecom.git
cd Parainage-Archive-Telecom
```
* Install the dependencies:
```bash
npm install
```
* Start the server (Node.js and application):
```bash
npm start
```
* Open your web browser and go to `http://localhost:8000` to view the application.

## Usage
* To **add a new parainage**, click on the `Add Parainage` button and fill in the form with the details, eventually creating a new student and new family if needed.
* If you feel there is an **error in the graph**, you can **report it** by clicking on the `Report Issue` button and filling in the form with the details of the issue.
* You can **drag and drop nodes to rearrange the graph for better visibility**.
* You can **zoom in and out** of the graph using your mouse wheel or touchpad gestures, and **automatically fit** the graph to the viewport by clicking on the `Zoom to Fit` button.
* You can **auto arrange the graph by promotion year** by clicking on the `Arrange by Promotion` button.
* To **freeze the graph and prevent it from moving** after rearranging, click on the `Freeze Graph` button. To unfreeze it, click on the same button again.
* You can **restart the graph** to a random state by clicking on the `Restart Graph` button.
* You can **filter the graph by academic term** by clicking on the `Filter by Year` button and selecting the desired years from the dropdown menu.
* You can **save the current state of the graph as an image** (svg) by clicking on the `Save Graph` button.
* By **double clicking on a node**, you can view more details about the parainage, **focusing on the node, its children and parents**.
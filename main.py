import logging
import os
import pywinauto
import time
import PIL.Image
import PIL.ImageGrab

from pywinauto.application import Application

# Initialize logging settings
logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)

# Path Constants
pathToFBB = 'C:\Program Files (x86)\GDS\Fast Break Pro Basketball 3'
fullFBBPath = 'C:\Program Files (x86)\GDS\Fast Break Pro Basketball 3\FBPB3.exe'

# Set active directory to folder with FBPB
os.chdir(pathToFBB)

# Start FBPB
app = Application().start(fullFBBPath)
activeWindow = app.top_window()

activeWindow.ThunderRT6UserControlDC2.click()
# activeWindow.print_control_identifiers()

childWindow = activeWindow.child_window(title='Load Saved Game')

# load the active file 
pywinauto.mouse.double_click(coords=(1274,529))

# Wait for loading
app.wait_cpu_usage_lower(threshold=2.5)

# Log-in (1297,570)
pywinauto.mouse.click(coords=(1297,570))
pywinauto.keyboard.send_keys('5sixers8'
                             '{ENTER}')

time.sleep(.5)

# left, upper, right, lower
calendarImage = PIL.ImageGrab.grab(bbox=(1213, 417, 1364, 437))

calendarImage.save('img.jpg')

# Export Data Files (1058,364)


# childWindow.ThunderRT6UserControlDC4.click()

# pywinauto.findbestmatch.find_best_control_matches("ThunderRT6UserControlDC12", activeWindow._ctrl_identifiers())
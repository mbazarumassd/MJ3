// Set the SVG container dimensions to match the window size
const width = window.innerWidth;
const height = window.innerHeight;

// Create an SVG element for the visualization
const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
    }));

// Create a group to hold the zoomable content
const zoomGroup = svg.append("g");

// Load the network data from the JSON file
d3.json("author_network_data_with_links.json").then(data => {
    console.log("Data successfully loaded:", data);

    // Compute the degree (number of connections) for each node
    const connectionCount = {};
    data.links.forEach(link => {
        connectionCount[link.source] = (connectionCount[link.source] || 0) + 1;
        connectionCount[link.target] = (connectionCount[link.target] || 0) + 1;
    });

    // Add the degree value to each node
    data.nodes.forEach(node => {
        node.degree = connectionCount[node.name] || 0;
    });

    // Define a size scale for nodes based on their degree
    const nodeSizeScale = d3.scaleSqrt()
        .domain(d3.extent(data.nodes, d => d.degree))
        .range([3, 12]);

    // Extract unique countries and define a color scale
    const uniqueCountries = Array.from(new Set(data.nodes.map(d => d.country)));
    const countryColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueCountries);

    // Initialize the force simulation
    const forceSimulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.name).strength(0.5))
        .force("charge", d3.forceManyBody().strength(-30))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => nodeSizeScale(d.degree) + 2));

    // Render the links
    const linkElements = zoomGroup.append("g")
        .selectAll("line")
        .data(data.links)
        .enter()
        .append("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 1.5);

    // Render the nodes with interactivity
    const nodeElements = zoomGroup.append("g")
        .selectAll("circle")
        .data(data.nodes)
        .enter()
        .append("circle")
        .attr("r", d => nodeSizeScale(d.degree))
        .attr("fill", d => countryColorScale(d.country))
        .call(applyDragBehavior(forceSimulation));

    // Set up the tooltip for interactivity
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid")
        .style("padding", "10px")
        .style("display", "none");

    // Define node interactivity
    nodeElements
        .on("mouseover", (event, d) => {
            tooltip.style("display", "block")
                .html(`<strong>${d.name}</strong><br>Country: ${d.country}<br>Connections: ${d.degree}`);
            nodeElements.attr("opacity", n => n.country === d.country ? 1 : 0.2);
        })
        .on("mousemove", event => {
            tooltip.style("top", `${event.pageY + 5}px`).style("left", `${event.pageX + 5}px`);
        })
        .on("mouseout", () => {
            tooltip.style("display", "none");
            nodeElements.attr("opacity", 1);
        })
        .on("click", (event, d) => {
            tooltip.style("display", "block")
                .html(`<strong>${d.name}</strong><br>Country: ${d.country}<br>Affiliation: ${d.affiliation || "Not provided"}`)
                .style("top", `${event.pageY + 5}px`)
                .style("left", `${event.pageX + 5}px`);
        });

    // Update positions as the simulation progresses
    forceSimulation.on("tick", () => {
        linkElements
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        nodeElements
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

    // Render the legend
    const legend = d3.select(".legend");

    legend.selectAll(".legend-item").remove(); // Clear existing legend items

    uniqueCountries.forEach(country => {
        const legendItem = legend.append("div").attr("class", "legend-item");

        legendItem.append("div")
            .style("background-color", country === "Other" ? "#A9A9A9" : countryColorScale(country))
            .style("width", "15px")
            .style("height", "15px")
            .style("display", "inline-block")
            .style("margin-right", "10px");

        legendItem.append("span").text(country);
    });

    // Add controls for modifying force parameters
    d3.select("#forceStrength").on("input", function () {
        forceSimulation.force("charge").strength(+this.value);
        forceSimulation.alpha(1).restart();
    });

    d3.select("#collisionRadius").on("input", function () {
        forceSimulation.force("collide").radius(d => nodeSizeScale(d.degree) + +this.value);
        forceSimulation.alpha(1).restart();
    });

    d3.select("#linkStrength").on("input", function () {
        forceSimulation.force("link").strength(+this.value);
        forceSimulation.alpha(1).restart();
    });
}).catch(error => {
    console.error("Error loading the JSON data:", error);
});

// Function to enable dragging behavior
function applyDragBehavior(simulation) {
    return d3.drag()
        .on("start", event => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        })
        .on("drag", event => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        })
        .on("end", event => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        });
}

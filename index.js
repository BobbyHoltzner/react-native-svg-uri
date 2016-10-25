'use strict';
import React, {Component, PropTypes} from "react";
import {View} from 'react-native';
import xmldom from 'xmldom'; // Dependencie
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';

import Svg,{
    Circle,
    Ellipse,
    G ,
    LinearGradient,
    RadialGradient,
    Line,
    Path,
    Polygon,
    Polyline,
    Rect,
    Symbol,
    Use,
    Defs,
    Stop
} from 'react-native-svg';


// Attributes that only change his name
const ATTS_TRANSFORMED_NAMES={'stroke-linejoin':'strokeLinejoin',
    'stroke-linecap':'strokeLinecap',
    'stroke-width':'strokeWidth',
    //  'stroke-miterlimit':'strokeMiterlimit',
};

let ind = 1;

export default class SvgImage extends Component{

    constructor(props){
        super(props);

        this.state = {svgXmlData:null};
        if (props.source) {
            const source = resolveAssetSource(props.source) || {};
            this.fecthSVGData(source.uri);
        }
    }

    fecthSVGData=async (uri)=>{
        try {
            let response = await fetch(uri);
            let responseXML = await response.text();
            this.setState({svgXmlData:responseXML});
            return responseXML;
        } catch(error) {
            console.error(error);
        }
    }

    componentWillReceiveProps (nextProps){
        if (nextProps.source) {
            const source = resolveAssetSource(nextProps.source) || {};
            const oldSource = resolveAssetSource(this.props.source) || {};
            if(source.uri !== oldSource.uri){
                this.fecthSVGData(source.uri);
            }
        }
    }

    convertTransform = (transform) => {
        let arr = transform.split(") ");
        arr = arr.filter((e) => {return e});
        let transformArr = {transform: []};
        for(let i = 0; i < arr.length; i++){
            let single = arr[i].split("(");
            transformArr.transform.push(this.convertTransformAtt(single));
        }
        return transformArr;
    }

    convertTransformAtt = (single) => {
        let transformObj;
        let transform = single[1].split(",");
        switch(single[0]) {
            case "translate":
                transformObj = {
                    translateX: transform[0],
                    translateY: transform[1]
                };
                break;
            case "scale":
                transformObj = {
                    scaleX: transform[0],
                    scaleY: transform[1]
                };
                break;
        }
        return transformObj;
    }


    createSVGElement=(node, childs)=>{
        let componentAtts = {};
        let i = ind++;
        switch (node.nodeName) {
            case 'svg':
                componentAtts = this._getAttributes(node);
                if (this.props.width)
                    componentAtts.width = this.props.width;
                if (this.props.height)
                    componentAtts.height = this.props.height;
                componentAtts.preserveAspectRatio = "xMinYMax meet";
                return (
                    <Svg  
                        key={i} 
                        viewBox={componentAtts.viewBox} 
                        height={this.props.height} 
                        width={this.props.width}
                    >
                        {childs}
                    </Svg>
                );
            case 'g':
                componentAtts = this._getAttributes(node);
                if(componentAtts.transform)
                    componentAtts.transform = this.convertTransform(componentAtts.transform);  
                return <G key={i} {...componentAtts}>{childs}</G>;
            case 'path':
                componentAtts = this._getAttributes(node);
                if(componentAtts.transform)
                     componentAtts.transform = this.convertTransform(componentAtts.transform);
                componentAtts.transform = {}; // Transforms not working correctly
                return <Path  key={i} {...componentAtts}>{childs}</Path>;
            case 'circle':
                componentAtts = this._getAttributes(node);
                return <Circle key={i} {...componentAtts}>{childs}</Circle>;
            case 'rect':
                componentAtts = this._getAttributes(node);
                return <Rect key={i} {...componentAtts}>{childs}</Rect>;
            case 'linearGradient':
                componentAtts = this._getAttributes(node);
                return <Defs key={i}><LinearGradient  {...componentAtts}>{childs}</LinearGradient></Defs>;
            case 'radialGradient':
                componentAtts = this._getAttributes(node);
                return <Defs key={i}><RadialGradient  {...componentAtts}>{childs}</RadialGradient></Defs>;
            case 'stop':
                componentAtts = this._getAttributes(node);
                return <Stop key={i} {...componentAtts}>{childs}</Stop>;
            case 'polygon':
                componentAtts = this._getAttributes(node);
                componentAtts.strokeWidth = 20;
                return <Polygon key={i} {...componentAtts}>{childs}</Polygon>;
            default:
                return null;
        }
    }


    _getAttributes = (node)=>{
        let attrs = {}
        for (let i = 0; i < node.attributes.length; i++){
            let att = node.attributes[i]
            let attName = att.nodeName
            let attValue = att.nodeValue
            if (attName in ATTS_TRANSFORMED_NAMES){ // Valida que el atributo sea mapeable
                attrs[att.nodeName] = att.nodeValue;
            }else {
                if (attName == 'x' || attName == 'y' || attName == 'height' || attName == 'width'){
                    attValue = attValue.replace('px', ''); // Remove the px
                }
                if (attName == 'style'){
                    let styleAtts = attValue.split(';');
                    for (let i = 0; i < styleAtts.length; i++){
                        let styleAtt = styleAtts[i].split(':');
                        if (!styleAtt[1] || styleAtt[1] == '')
                            continue;
                        if (styleAtt[0] == 'stop-color')
                            attrs['stopColor'] = styleAtt[1];
                        else
                            attrs[styleAtt[0]] = styleAtt[1];
                    }
                }else {
                    attrs[attName] = attValue
                }
            }
            if(attrs["stroke-width"]) {
                attrs["strokeWidth"] = attrs["stroke-width"];
            }
        }
        return attrs
    }


    inspectNode=(node)=>{
        //Process the xml node
        let arrayElements = [];
        if (node.childNodes && node.childNodes.length > 0){
            for (let i = 0; i < node.childNodes.length; i++){
                let nodo = this.inspectNode(node.childNodes[i]);
                if (nodo != null)
                    arrayElements.push(nodo);
            }
        }
        let element = this.createSVGElement(node, arrayElements);
        return element;
    }

    render(){
        try{
            if (this.state.svgXmlData == null)
                return null;

            let inputSVG = this.state.svgXmlData.substring(this.state.svgXmlData.indexOf("<svg "), (this.state.svgXmlData.indexOf("</svg>") + 6));

            let doc = new xmldom.DOMParser().parseFromString(inputSVG);

            let rootSVG = this.inspectNode(doc.childNodes[0]);

            return(
                <View style={this.props.style}>
                    {rootSVG}
                </View>
            );
        }catch(e){
            console.error("ERROR SVG", e);
            return null;
        }
    }
}